import { NextRequest, NextResponse } from 'next/server'
import db, { sqlPagination } from '@/lib/db'
import { requirePermission } from '@/lib/api-auth'
import { appendOrgFilter } from '@/lib/tenant'
import { purchaseSchema } from '@/lib/validations'
import { ensurePurchaseSchema, ensureDocumentTermsColumns } from '@/lib/ensure-purchase-schema'
import { computePurchaseItemTotals } from '@/lib/purchase-totals'
import { roundToTwo } from '@/lib/utils'
import { randomUUID } from 'crypto'
import { apiErrorResponse } from '@/lib/api-error'
import { assertVendorInOrg } from '@/lib/org-entity'

export async function GET(req: NextRequest) {
  const { error, organizationId } = await requirePermission('purchases', 'view')
  if (error) return error

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || ''
  const status = searchParams.get('status')
  const vendorId = searchParams.get('vendorId')
  const fromDate = searchParams.get('fromDate')
  const toDate = searchParams.get('toDate')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = (page - 1) * limit

  const conditions: string[] = []
  const params: any[] = []
  if (search) { conditions.push('(p.bill_no LIKE ? OR v.name LIKE ?)'); const s = `%${search}%`; params.push(s, s) }
  if (status) { conditions.push('p.status = ?'); params.push(status) }
  if (vendorId) { conditions.push('p.vendor_id = ?'); params.push(vendorId) }
  if (fromDate) { conditions.push('p.date >= ?'); params.push(fromDate) }
  if (toDate) { conditions.push('p.date <= ?'); params.push(toDate) }
  appendOrgFilter(conditions, params, organizationId!, 'p')

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''
  try {
    const [rows] = await db.execute(
      `SELECT p.*, v.name as vendor_name FROM purchases p LEFT JOIN vendors v ON p.vendor_id = v.id
       ${where} ORDER BY p.date DESC ${sqlPagination(limit, offset)}`,
      params
    ) as any[]
    const [countRows] = await db.execute(
      `SELECT COUNT(*) as total FROM purchases p LEFT JOIN vendors v ON p.vendor_id = v.id ${where}`, params
    ) as any[]

    return NextResponse.json({ purchases: rows, total: countRows[0].total, page, limit })
  } catch (err) {
    return apiErrorResponse(err, 'GET /api/purchases')
  }
}

export async function POST(req: NextRequest) {
  const { error, organizationId } = await requirePermission('purchases', 'create')
  if (error) return error

  const conn = await db.getConnection()
  try {
    await ensurePurchaseSchema()
    await ensureDocumentTermsColumns()
    const body = await req.json()
    const data = purchaseSchema.parse(body)
    if (!(await assertVendorInOrg(data.vendorId, organizationId!))) {
      return NextResponse.json({ error: 'Invalid vendor' }, { status: 400 })
    }
    const gstType = data.gstType
    await conn.beginTransaction()



    let subtotal = 0,
      totalDiscount = 0,
      totalCgst = 0,
      totalSgst = 0,
      totalIgst = 0,
      totalRoundOff = 0,
      grandTotal = 0
    const itemsWithTotals = data.items.map((item: any) => {
      const t = computePurchaseItemTotals(item, gstType)
      subtotal += item.quantity * item.rate
      totalDiscount += t.discAmt
      totalCgst += t.cgst
      totalSgst += t.sgst
      totalIgst += t.igst
      totalRoundOff += t.lineRoundOff
      grandTotal += t.total
      return { ...item, ...t }
    })

    const roundOff = roundToTwo(totalRoundOff)
    const finalTotal = roundToTwo(grandTotal)

    const hasPaymentMode = Boolean(data.paymentMode && data.paymentMode.trim() !== '')
    const advanceAmount = Number(data.advanceAmount || 0)
    const directPaidAmount = hasPaymentMode ? finalTotal : 0
    let totalPaid = directPaidAmount + advanceAmount
    if (totalPaid > finalTotal) totalPaid = finalTotal

    const status = totalPaid >= finalTotal ? 'PAID' : 'PENDING'
    const paidAmount = totalPaid
    const balanceAmount = roundToTwo(finalTotal - paidAmount)
    const paymentMode = hasPaymentMode ? data.paymentMode : (advanceAmount > 0 ? 'ADVANCE' : null)
    const paymentRef = hasPaymentMode ? (data.paymentRef || null) : (advanceAmount > 0 ? 'Advance Adj' : null)

    const id = randomUUID()
    await conn.execute(
      `INSERT INTO purchases (id, organization_id, vendor_id, date, due_date, gst_type, bill_no, bill_date,
        subtotal, discount_amount, cgst_amount, sgst_amount, igst_amount, tax_amount, round_off, total_amount,
        paid_amount, balance_amount, payment_mode, payment_ref, notes, terms, status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, organizationId, data.vendorId, data.date, data.dueDate ? data.dueDate : null,
       gstType, data.billNo, data.billDate ? data.billDate : null,
       subtotal, totalDiscount, totalCgst, totalSgst, totalIgst, totalCgst + totalSgst + totalIgst, roundOff, finalTotal,
       paidAmount, balanceAmount,
       paymentMode ?? null, paymentRef ?? null, data.notes ? data.notes : null, data.terms ? data.terms : null, status]
    )

    for (let idx = 0; idx < itemsWithTotals.length; idx++) {
      const item = itemsWithTotals[idx]
      await conn.execute(
        `INSERT INTO purchase_items (id, purchase_id, product_id, description, quantity, rate,
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
          'UPDATE products SET current_stock = current_stock + ? WHERE id = ? AND organization_id = ?',
          [item.quantity, item.productId, organizationId]
        )
        const [[stockRow]] = await conn.execute(
          'SELECT current_stock FROM products WHERE id = ? AND organization_id = ?',
          [item.productId, organizationId]
        ) as any[][]
        await conn.execute(
          'INSERT INTO stock_movements (id, product_id, type, quantity, balance_after, reference_type, reference_id, note) VALUES (?,?,?,?,?,?,?,?)',
          [randomUUID(), item.productId, 'IN', item.quantity, stockRow.current_stock, 'PURCHASE', id, data.billNo]
        )
      }
    }

    if (hasPaymentMode && directPaidAmount > 0) {
      const [countResult] = (await conn.execute(
        `SELECT COUNT(*) as cnt FROM payments WHERE organization_id = ? AND type = 'OUTWARD'`,
        [organizationId]
      )) as any[]
      const nextSeq = Number(countResult[0]?.cnt || 0) + 1
      const paymentNo = `PAY-OUT-${String(nextSeq).padStart(5, '0')}`

      await conn.execute(
        `INSERT INTO payments (
          id, organization_id, payment_no, type, vendor_id, purchase_id,
          amount, payment_date, payment_mode, reference_no, reference_id, status
        ) VALUES (?, ?, ?, 'OUTWARD', ?, ?, ?, ?, ?, ?, ?, 'COMPLETED')`,
        [
          randomUUID(),
          organizationId,
          paymentNo,
          data.vendorId,
          id,
          directPaidAmount,
          data.date,
          paymentMode ?? 'CASH',
          paymentRef || data.billNo,
          id,
        ]
      )
    }

    if (advanceAmount > 0) {
      let remainingAdvanceToApply = advanceAmount
      const [unallocatedPayments] = (await conn.execute(
        `SELECT * FROM payments WHERE vendor_id = ? AND organization_id = ? AND type = 'OUTWARD' AND purchase_id IS NULL ORDER BY payment_date ASC, created_at ASC`,
        [data.vendorId, organizationId]
      )) as any[]

      for (const p of unallocatedPayments as any[]) {
        if (remainingAdvanceToApply <= 0) break
        const pAmt = Number(p.amount)
        if (pAmt <= remainingAdvanceToApply) {
          await conn.execute('UPDATE payments SET purchase_id = ?, reference_id = ? WHERE id = ?', [id, id, p.id])
          remainingAdvanceToApply -= pAmt
        } else {
          const allocatedId = randomUUID()
          const remainderAmt = pAmt - remainingAdvanceToApply
          await conn.execute('UPDATE payments SET amount = ? WHERE id = ?', [remainderAmt, p.id])
          await conn.execute(
            `INSERT INTO payments (
              id, organization_id, payment_no, type, vendor_id, purchase_id,
              amount, payment_date, payment_mode, reference_no, reference_id, status, notes
            ) VALUES (?, ?, ?, 'OUTWARD', ?, ?, ?, ?, ?, ?, ?, 'COMPLETED', ?)`,
            [
              allocatedId,
              organizationId,
              `${p.payment_no || 'PAY-OUT'}-ADJ`,
              data.vendorId,
              id,
              remainingAdvanceToApply,
              p.payment_date,
              p.payment_mode,
              p.reference_no ? `${p.reference_no} (Advance Adj)` : 'Advance Adj',
              id,
              'Adjusted against Purchase Bill'
            ]
          )
          remainingAdvanceToApply = 0
        }
      }
    }

    await conn.commit()
    const [rows] = await db.execute(
      'SELECT p.*, v.name as vendor_name FROM purchases p LEFT JOIN vendors v ON p.vendor_id = v.id WHERE p.id = ? AND p.organization_id = ?',
      [id, organizationId]
    ) as any[]
    return NextResponse.json(rows[0], { status: 201 })
  } catch (err: any) {
    await conn.rollback()
    if (err.name === 'ZodError') return NextResponse.json({ error: err.errors }, { status: 400 })
    console.error('[POST /api/purchases] error:', err?.sqlMessage ?? err?.message ?? err)
    const message = err?.sqlMessage || err?.message || 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  } finally {
    conn.release()
  }
}
