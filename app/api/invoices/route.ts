import { NextRequest, NextResponse } from 'next/server'
import db, { sqlPagination } from '@/lib/db'
import { requirePermission } from '@/lib/api-auth'
import { appendOrgFilter } from '@/lib/tenant'
import { invoiceSchema } from '@/lib/validations'
import { ensureInvoiceSchema } from '@/lib/ensure-invoice-schema'
import { roundToNearestRupee, roundToTwo } from '@/lib/utils'
import { computeSalesDocumentItemTotals } from '@/lib/sales-document-totals'
import { randomUUID } from 'crypto'
import { apiErrorResponse } from '@/lib/api-error'
import { buildDocumentNumber, buildDocumentNumberLikePattern, fetchMaxDocumentSerial } from '@/lib/document-number'
import { assertCustomerInOrg } from '@/lib/org-entity'

function computeItemTotals(item: any, gstType: string) {
  return computeSalesDocumentItemTotals(
    {
      quantity: Number(item.quantity) || 0,
      rate: Number(item.rate) || 0,
      discount: Number(item.discount) || 0,
      gstRate: Number(item.gstRate) || 0,
    },
    (gstType as 'CGST_SGST' | 'IGST' | 'EXEMPT') || 'CGST_SGST'
  )
}

export async function GET(req: NextRequest) {
  const { error, organizationId } = await requirePermission('billing', 'view')
  if (error) return error

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || ''
  const company = searchParams.get('company') || ''
  const invoiceNo = searchParams.get('invoiceNo') || ''
  const customerId = searchParams.get('customerId')
  const fromDate = searchParams.get('fromDate')
  const toDate = searchParams.get('toDate')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = (page - 1) * limit

  const conditions: string[] = []
  const params: any[] = []
  if (search) { conditions.push('(i.invoice_no LIKE ? OR c.name LIKE ?)'); const s = `%${search}%`; params.push(s, s) }
  if (company) { conditions.push('c.name LIKE ?'); params.push(`%${company}%`) }
  if (invoiceNo) { conditions.push('i.invoice_no LIKE ?'); params.push(`%${invoiceNo}%`) }
  if (customerId) { conditions.push('i.customer_id = ?'); params.push(customerId) }
  if (fromDate) { conditions.push('i.date >= ?'); params.push(fromDate) }
  if (toDate) { conditions.push('i.date <= ?'); params.push(toDate) }
  appendOrgFilter(conditions, params, organizationId!, 'i')

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''
  try {
    const [rows] = await db.execute(
      `SELECT i.*, c.name as customer_name FROM invoices i LEFT JOIN customers c ON i.customer_id = c.id
       ${where} ORDER BY i.date DESC, i.created_at DESC ${sqlPagination(limit, offset)}`,
      params
    ) as any[]
    const [countRows] = await db.execute(
      `SELECT COUNT(*) as total FROM invoices i LEFT JOIN customers c ON i.customer_id = c.id ${where}`, params
    ) as any[]

    return NextResponse.json({ invoices: rows, total: countRows[0].total, page, limit })
  } catch (err) {
    return apiErrorResponse(err, 'GET /api/invoices')
  }
}

export async function POST(req: NextRequest) {
  const { error, organizationId } = await requirePermission('billing', 'create')
  if (error) return error

  const conn = await db.getConnection()
  try {
    await ensureInvoiceSchema()
    const body = await req.json()
    const data = invoiceSchema.parse(body)
    if (!(await assertCustomerInOrg(data.customerId, organizationId!))) {
      return NextResponse.json({ error: 'Invalid customer' }, { status: 400 })
    }
    const gstType = data.gstType
    await conn.beginTransaction()

    // Generate invoice number
    const [settings] = await conn.execute(
      'SELECT invoice_prefix, document_number_separator, document_number_structure FROM business_settings WHERE organization_id = ? LIMIT 1',
      [organizationId]
    ) as any[]
    const prefix = settings[0]?.invoice_prefix || 'INV'
    const separator = settings[0]?.document_number_separator ?? '/'
    const structure = settings[0]?.document_number_structure ?? 'PREFIX_SERIAL_FY'
    const likePattern = buildDocumentNumberLikePattern(prefix, data.date, separator, structure)
    // Compute totals (match UI)
    let subtotal = 0, totalDiscount = 0, totalCgst = 0, totalSgst = 0, totalIgst = 0, grandTotal = 0
    const itemsWithTotals = data.items.map((item: any) => {
      const t = computeItemTotals(item, gstType)
      subtotal += t.taxable
      totalDiscount += t.discAmt
      totalCgst += t.cgst
      totalSgst += t.sgst
      totalIgst += t.igst
      grandTotal += t.total
      return { ...item, ...t }
    })
    const taxAmount = roundToTwo(totalCgst + totalSgst + totalIgst)
    const totalAmount = roundToNearestRupee(roundToTwo(grandTotal))
    const id = randomUUID()
    const partyDetailsJson = data.partyDetails ? JSON.stringify(data.partyDetails) : null

    const hasPaymentMode = Boolean(data.paymentMode && data.paymentMode.trim() !== '')
    const advanceAmount = Number(data.advanceAmount || 0)
    const directPaidAmount = hasPaymentMode ? totalAmount : 0
    let totalPaid = directPaidAmount + advanceAmount
    if (totalPaid > totalAmount) totalPaid = totalAmount

    const status = totalPaid >= totalAmount ? 'Paid' : 'Due'
    const paidAmount = totalPaid
    const balanceAmount = roundToTwo(totalAmount - paidAmount)
    const paymentMode = hasPaymentMode ? data.paymentMode : (advanceAmount > 0 ? 'ADVANCE' : null)
    const paymentRef = hasPaymentMode ? (data.paymentRef || null) : (advanceAmount > 0 ? 'Advance Adj' : null)

    // Retry loop: use MAX() serial + retry on duplicate to avoid ordering bugs & race conditions
    let invoiceNo = ''
    let inserted = false
    for (let attempt = 0; attempt < 10 && !inserted; attempt++) {
      const maxSerial = await fetchMaxDocumentSerial(conn, 'invoices', 'invoice_no', organizationId!, likePattern, separator, structure)
      invoiceNo = buildDocumentNumber(prefix, maxSerial + 1 + attempt, data.date, separator, structure)

      try {
        await conn.execute(
          `INSERT INTO invoices (id, organization_id, invoice_no, customer_id, date, due_date, status, gst_type, place_of_supply,
            subtotal, discount_amount, cgst_amount, sgst_amount, igst_amount, tax_amount, total_amount,
            paid_amount, balance_amount, payment_mode, payment_ref, notes, terms, party_details)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [id, organizationId, invoiceNo, data.customerId, data.date, data.dueDate || null, status,
           gstType, data.placeOfSupply || null,
           roundToTwo(subtotal), roundToTwo(totalDiscount), roundToTwo(totalCgst), roundToTwo(totalSgst), roundToTwo(totalIgst), taxAmount, totalAmount,
           paidAmount, balanceAmount,
           paymentMode ?? null, paymentRef ?? null, data.notes || null, data.terms || null, partyDetailsJson]
        )
        inserted = true
      } catch (dupErr: any) {
        if (dupErr?.errno !== 1062) throw dupErr
      }
    }
    if (!inserted) throw new Error('Could not generate a unique invoice number after 10 attempts')

    for (let idx = 0; idx < itemsWithTotals.length; idx++) {
      const item = itemsWithTotals[idx]
      await conn.execute(
        `INSERT INTO invoice_items (id, invoice_id, product_id, description, quantity, rate,
          discount, gst_rate, cgst_rate, sgst_rate, igst_rate, cgst_amount, sgst_amount, igst_amount, gst_amount, amount, sort_order)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [randomUUID(), id, item.productId || null, item.description || null,
         item.quantity, item.rate, item.discount || 0, item.gstRate,
         gstType === 'CGST_SGST' ? item.gstRate / 2 : 0,
         gstType === 'CGST_SGST' ? item.gstRate / 2 : 0,
         gstType === 'IGST' ? item.gstRate : 0,
         item.cgst, item.sgst, item.igst, item.cgst + item.sgst + item.igst, item.total, idx + 1]
      )
      if (item.productId) {
        await conn.execute(
          'UPDATE products SET current_stock = GREATEST(0, current_stock - ?) WHERE id = ? AND organization_id = ?',
          [item.quantity, item.productId, organizationId]
        )
        const [[stockRow]] = await conn.execute(
          'SELECT current_stock FROM products WHERE id = ? AND organization_id = ?',
          [item.productId, organizationId]
        ) as any[][]
        await conn.execute(
          'INSERT INTO stock_movements (id, product_id, type, quantity, balance_after, reference_type, reference_id, note) VALUES (?,?,?,?,?,?,?,?)',
          [randomUUID(), item.productId, 'OUT', item.quantity, stockRow.current_stock, 'INVOICE', id, invoiceNo]
        )
      }
    }

    if (hasPaymentMode && directPaidAmount > 0) {
      const [countResult] = (await conn.execute(
        `SELECT COUNT(*) as cnt FROM payments WHERE organization_id = ? AND type = 'INWARD'`,
        [organizationId]
      )) as any[]
      const nextSeq = Number(countResult[0]?.cnt || 0) + 1
      const paymentNo = `PAY-IN-${String(nextSeq).padStart(5, '0')}`

      await conn.execute(
        `INSERT INTO payments (
          id, organization_id, payment_no, type, customer_id, invoice_id,
          amount, payment_date, payment_mode, reference_no, reference_id, status
        ) VALUES (?, ?, ?, 'INWARD', ?, ?, ?, ?, ?, ?, ?, 'COMPLETED')`,
        [
          randomUUID(),
          organizationId,
          paymentNo,
          data.customerId,
          id,
          directPaidAmount,
          data.date,
          data.paymentMode ?? 'CASH',
          data.paymentRef || invoiceNo,
          id,
        ]
      )
    }

    if (advanceAmount > 0) {
      let remainingAdvanceToApply = advanceAmount
      const [unallocatedPayments] = (await conn.execute(
        `SELECT * FROM payments WHERE customer_id = ? AND organization_id = ? AND type = 'INWARD' AND invoice_id IS NULL ORDER BY payment_date ASC, created_at ASC`,
        [data.customerId, organizationId]
      )) as any[]

      for (const p of unallocatedPayments as any[]) {
        if (remainingAdvanceToApply <= 0) break
        const pAmt = Number(p.amount)
        if (pAmt <= remainingAdvanceToApply) {
          await conn.execute('UPDATE payments SET invoice_id = ?, reference_id = ? WHERE id = ?', [id, id, p.id])
          remainingAdvanceToApply -= pAmt
        } else {
          const allocatedId = randomUUID()
          const remainderAmt = pAmt - remainingAdvanceToApply
          await conn.execute('UPDATE payments SET amount = ? WHERE id = ?', [remainderAmt, p.id])
          await conn.execute(
            `INSERT INTO payments (
              id, organization_id, payment_no, type, customer_id, invoice_id,
              amount, payment_date, payment_mode, reference_no, reference_id, status, notes
            ) VALUES (?, ?, ?, 'INWARD', ?, ?, ?, ?, ?, ?, ?, 'COMPLETED', ?)`,
            [
              allocatedId,
              organizationId,
              `${p.payment_no || 'PAY-IN'}-ADJ`,
              data.customerId,
              id,
              remainingAdvanceToApply,
              p.payment_date,
              p.payment_mode,
              p.reference_no ? `${p.reference_no} (Advance Adj)` : 'Advance Adj',
              id,
              'Adjusted against Invoice'
            ]
          )
          remainingAdvanceToApply = 0
        }
      }
    }

    if (data.fromQuotationId) {
      await conn.execute(
        `UPDATE quotations SET status = 'CONVERTED', converted_to_id = ? WHERE id = ? AND organization_id = ?`,
        [id, data.fromQuotationId, organizationId]
      )
    }

    await conn.commit()
    const [rows] = await db.execute(
      'SELECT i.*, c.name as customer_name FROM invoices i LEFT JOIN customers c ON i.customer_id = c.id WHERE i.id = ? AND i.organization_id = ?',
      [id, organizationId]
    ) as any[]
    return NextResponse.json(rows[0], { status: 201 })
  } catch (err: any) {
    await conn.rollback()
    if (err.name === 'ZodError') return NextResponse.json({ error: err.errors }, { status: 400 })
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    conn.release()
  }
}
