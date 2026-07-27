import { NextRequest, NextResponse } from 'next/server'
import db, { sqlPagination } from '@/lib/db'
import { requirePermission } from '@/lib/api-auth'
import { appendOrgFilter } from '@/lib/tenant'
import { paymentSchema } from '@/lib/validations'
import { ensurePaymentSchema } from '@/lib/ensure-payment-schema'
import { randomUUID } from 'crypto'
import { apiErrorResponse } from '@/lib/api-error'
import { assertCustomerInOrg, assertVendorInOrg } from '@/lib/org-entity'

export async function GET(req: NextRequest) {
  const { error, organizationId } = await requirePermission('payments', 'view')
  if (error) return error

  await ensurePaymentSchema()

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || ''
  const type = searchParams.get('type') // ALL, INWARD, OUTWARD
  const paymentMode = searchParams.get('paymentMode')
  const customerId = searchParams.get('customerId')
  const vendorId = searchParams.get('vendorId')
  const fromDate = searchParams.get('fromDate')
  const toDate = searchParams.get('toDate')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = (page - 1) * limit

  const conditions: string[] = []
  const params: any[] = []

  if (type && type !== 'ALL') {
    conditions.push('p.type = ?')
    params.push(type)
  }

  if (search) {
    conditions.push('(p.payment_no LIKE ? OR p.reference_no LIKE ? OR c.name LIKE ? OR v.name LIKE ? OR p.notes LIKE ?)')
    const s = `%${search}%`
    params.push(s, s, s, s, s)
  }

  if (paymentMode) {
    conditions.push('p.payment_mode = ?')
    params.push(paymentMode)
  }

  if (customerId) {
    conditions.push('p.customer_id = ?')
    params.push(customerId)
  }

  if (vendorId) {
    conditions.push('p.vendor_id = ?')
    params.push(vendorId)
  }

  if (fromDate) {
    conditions.push('p.payment_date >= ?')
    params.push(fromDate)
  }

  if (toDate) {
    conditions.push('p.payment_date <= ?')
    params.push(`${toDate} 23:59:59`)
  }

  appendOrgFilter(conditions, params, organizationId!, 'p')

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''

  try {
    const [rows] = (await db.execute(
      `SELECT p.*,
              c.name as customer_name,
              v.name as vendor_name,
              i.invoice_no as linked_invoice_no,
              pur.bill_no as linked_bill_no
       FROM payments p
       LEFT JOIN customers c ON p.customer_id = c.id
       LEFT JOIN vendors v ON p.vendor_id = v.id
       LEFT JOIN invoices i ON p.invoice_id = i.id
       LEFT JOIN purchases pur ON p.purchase_id = pur.id
       ${where}
       ORDER BY p.payment_date DESC, p.created_at DESC
       ${sqlPagination(limit, offset)}`,
      params
    )) as any[]

    const [countRows] = (await db.execute(
      `SELECT COUNT(*) as total FROM payments p
       LEFT JOIN customers c ON p.customer_id = c.id
       LEFT JOIN vendors v ON p.vendor_id = v.id
       ${where}`,
      params
    )) as any[]

    // Summary calculations (Total Inward, Total Outward, Net Cashflow)
    const summaryConditions: string[] = []
    const summaryParams: any[] = []
    appendOrgFilter(summaryConditions, summaryParams, organizationId!, 'p')
    const summaryWhere = summaryConditions.length ? 'WHERE ' + summaryConditions.join(' AND ') : ''

    const [summaryRows] = (await db.execute(
      `SELECT 
        COALESCE(SUM(CASE WHEN p.type = 'INWARD' THEN p.amount ELSE 0 END), 0) as totalInward,
        COALESCE(SUM(CASE WHEN p.type = 'OUTWARD' THEN p.amount ELSE 0 END), 0) as totalOutward
       FROM payments p ${summaryWhere}`,
      summaryParams
    )) as any[]

    const totalInward = Number(summaryRows[0]?.totalInward || 0)
    const totalOutward = Number(summaryRows[0]?.totalOutward || 0)
    const netCashflow = totalInward - totalOutward

    return NextResponse.json({
      payments: rows,
      total: countRows[0]?.total || 0,
      summary: {
        totalInward,
        totalOutward,
        netCashflow,
      },
      page,
      limit,
    })
  } catch (err) {
    return apiErrorResponse(err, 'GET /api/payments')
  }
}

export async function POST(req: NextRequest) {
  const { error, organizationId, session } = await requirePermission('payments', 'create')
  if (error) return error

  const conn = await db.getConnection()
  try {
    await ensurePaymentSchema()
    const body = await req.json()
    const data = paymentSchema.parse(body)

    if (data.type === 'INWARD' && data.customerId) {
      if (!(await assertCustomerInOrg(data.customerId, organizationId!))) {
        return NextResponse.json({ error: 'Invalid customer for organization' }, { status: 400 })
      }
    }

    if (data.type === 'OUTWARD' && data.vendorId) {
      if (!(await assertVendorInOrg(data.vendorId, organizationId!))) {
        return NextResponse.json({ error: 'Invalid vendor for organization' }, { status: 400 })
      }
    }

    await conn.beginTransaction()

    // Generate unique payment number
    const prefix = data.type === 'INWARD' ? 'PAY-IN' : 'PAY-OUT'
    const [countResult] = (await conn.execute(
      `SELECT COUNT(*) as cnt FROM payments WHERE organization_id = ? AND type = ?`,
      [organizationId, data.type]
    )) as any[]

    const nextSeq = Number(countResult[0]?.cnt || 0) + 1
    const paymentNo = `${prefix}-${String(nextSeq).padStart(5, '0')}`
    const paymentId = randomUUID()
    const paymentDateFormatted = data.paymentDate.includes(' ') ? data.paymentDate : `${data.paymentDate} 12:00:00`

    // 1. Insert payment record
    await conn.execute(
      `INSERT INTO payments (
        id, organization_id, payment_no, type, customer_id, vendor_id,
        invoice_id, purchase_id, amount, payment_date, payment_mode,
        reference_no, bank_name, cheque_date, status, notes, reference_id, created_by_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETED', ?, ?, ?)`,
      [
        paymentId,
        organizationId,
        paymentNo,
        data.type,
        data.customerId || null,
        data.vendorId || null,
        data.invoiceId || null,
        data.purchaseId || null,
        data.amount,
        paymentDateFormatted,
        data.paymentMode,
        data.referenceNo || null,
        data.bankName || null,
        data.chequeDate || null,
        data.notes || null,
        null,
        session?.user?.id || null,
      ]
    )

    // 2. If linked to an Invoice (Inward Customer Payment)
    if (data.type === 'INWARD' && data.invoiceId) {
      const [invRows] = (await conn.execute(
        `SELECT total_amount, paid_amount FROM invoices WHERE id = ? AND organization_id = ? FOR UPDATE`,
        [data.invoiceId, organizationId]
      )) as any[]

      if (invRows.length > 0) {
        const inv = invRows[0]
        const totalAmount = Number(inv.total_amount || 0)
        const currentPaid = Number(inv.paid_amount || 0)
        const newPaid = currentPaid + data.amount
        const newBalance = Math.max(0, totalAmount - newPaid)
        const newStatus = newBalance <= 0 ? 'PAID' : 'PARTIAL'

        await conn.execute(
          `UPDATE invoices SET paid_amount = ?, balance_amount = ?, status = ? WHERE id = ? AND organization_id = ?`,
          [newPaid, newBalance, newStatus, data.invoiceId, organizationId]
        )
      }
    }

    // 3. If linked to a Purchase (Outward Vendor Payment)
    if (data.type === 'OUTWARD' && data.purchaseId) {
      const [purRows] = (await conn.execute(
        `SELECT total_amount, paid_amount FROM purchases WHERE id = ? AND organization_id = ? FOR UPDATE`,
        [data.purchaseId, organizationId]
      )) as any[]

      if (purRows.length > 0) {
        const pur = purRows[0]
        const totalAmount = Number(pur.total_amount || 0)
        const currentPaid = Number(pur.paid_amount || 0)
        const newPaid = currentPaid + data.amount
        const newBalance = Math.max(0, totalAmount - newPaid)
        const newStatus = newBalance <= 0 ? 'PAID' : 'PARTIAL'

        await conn.execute(
          `UPDATE purchases SET paid_amount = ?, balance_amount = ?, status = ? WHERE id = ? AND organization_id = ?`,
          [newPaid, newBalance, newStatus, data.purchaseId, organizationId]
        )
      }
    }

    // 4. Create Ledger Entry
    try {
      const ledgerId = randomUUID()
      if (data.type === 'INWARD' && data.customerId) {
        await conn.execute(
          `INSERT INTO ledger_entries (
            id, customer_id, type, debit, credit, balance,
            reference_id, reference_type, reference_no, date, description
          ) VALUES (?, ?, 'RECEIPT', 0, ?, 0, ?, 'PAYMENT_INWARD', ?, ?, ?)`,
          [
            ledgerId,
            data.customerId,
            data.amount,
            paymentId,
            paymentNo,
            paymentDateFormatted,
            `Received payment (${data.paymentMode}) - Ref: ${data.referenceNo || 'N/A'}`,
          ]
        )
      } else if (data.type === 'OUTWARD' && data.vendorId) {
        await conn.execute(
          `INSERT INTO ledger_entries (
            id, vendor_id, type, debit, credit, balance,
            reference_id, reference_type, reference_no, date, description
          ) VALUES (?, ?, 'PAYMENT', ?, 0, 0, ?, 'PAYMENT_OUTWARD', ?, ?, ?)`,
          [
            ledgerId,
            data.vendorId,
            data.amount,
            paymentId,
            paymentNo,
            paymentDateFormatted,
            `Paid vendor (${data.paymentMode}) - Ref: ${data.referenceNo || 'N/A'}`,
          ]
        )
      }
    } catch {
      // Ignore ledger failure if ledger_entries table is missing columns or non-critical
    }

    await conn.commit()

    return NextResponse.json({
      success: true,
      payment: {
        id: paymentId,
        paymentNo,
        amount: data.amount,
        type: data.type,
      },
    })
  } catch (err) {
    await conn.rollback()
    return apiErrorResponse(err, 'POST /api/payments')
  } finally {
    conn.release()
  }
}
