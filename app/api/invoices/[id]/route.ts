import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { requirePermission } from '@/lib/api-auth'
import { invoiceSchema } from '@/lib/validations'
import { ensureInvoiceSchema } from '@/lib/ensure-invoice-schema'
import { roundToNearestRupee, roundToTwo } from '@/lib/utils'
import { computeSalesDocumentItemTotals } from '@/lib/sales-document-totals'
import { randomUUID } from 'crypto'
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

async function insertInvoiceItems(
  conn: Awaited<ReturnType<typeof db.getConnection>>,
  invoiceId: string,
  invoiceNo: string,
  itemsWithTotals: any[],
  gstType: string,
  organizationId: string
) {
  for (let idx = 0; idx < itemsWithTotals.length; idx++) {
    const item = itemsWithTotals[idx]
    await conn.execute(
      `INSERT INTO invoice_items (id, invoice_id, product_id, description, quantity, rate,
        discount, gst_rate, cgst_rate, sgst_rate, igst_rate, cgst_amount, sgst_amount, igst_amount, gst_amount, amount, sort_order)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [randomUUID(), invoiceId, item.productId || null, item.description || null,
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
        [randomUUID(), item.productId, 'OUT', item.quantity, stockRow.current_stock, 'INVOICE', invoiceId, invoiceNo]
      )
    }
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { error, organizationId } = await requirePermission('billing', 'view')
  if (error) return error

  await ensureInvoiceSchema()

  const [rows] = await db.execute(
    `SELECT i.*,
       c.name as customer_name,
       c.gstin as customer_gstin,
       c.contact_person as customer_contact_person,
       c.phone as customer_phone,
       c.mobile as customer_mobile,
       c.pan as customer_pan,
       c.billing_address,
       c.billing_city,
       c.billing_state,
       c.billing_pincode,
       c.shipping_address as customer_shipping_address,
       c.shipping_city as customer_shipping_city
     FROM invoices i LEFT JOIN customers c ON i.customer_id = c.id WHERE i.id = ? AND i.organization_id = ?`,
    [id, organizationId]
  ) as any[]
  if (!rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const [items] = await db.execute(
    'SELECT ii.*, p.sku FROM invoice_items ii LEFT JOIN products p ON ii.product_id = p.id WHERE ii.invoice_id = ? ORDER BY ii.sort_order ASC, ii.id ASC',
    [id]
  ) as any[]
  const [payments] = await db.execute(
    'SELECT * FROM payments WHERE reference_id = ? AND type = ? ORDER BY payment_date DESC',
    [id, 'INVOICE']
  ) as any[]

  return NextResponse.json({ ...rows[0], items, payments })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { error, organizationId } = await requirePermission('billing', 'edit')
  if (error) return error

  const conn = await db.getConnection()
  try {
    await ensureInvoiceSchema()
    const body = await req.json()

    if (!body.items || !Array.isArray(body.items)) {
      const [rows] = await conn.execute(
        'SELECT * FROM invoices WHERE id = ? AND organization_id = ?',
        [id, organizationId]
      ) as any[]
      if (!rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })

      const { paidAmount, paymentMode, notes } = body
      const paid = paidAmount !== undefined ? paidAmount : rows[0].paid_amount
      const balance = rows[0].total_amount - paid

      await conn.execute(
        `UPDATE invoices SET paid_amount = ?, balance_amount = ?,
          payment_mode = COALESCE(?, payment_mode), notes = COALESCE(?, notes)
         WHERE id = ? AND organization_id = ?`,
        [paid, balance, paymentMode || null, notes || null, id, organizationId]
      )

      const [updated] = await db.execute(
        'SELECT i.*, c.name as customer_name FROM invoices i LEFT JOIN customers c ON i.customer_id = c.id WHERE i.id = ? AND i.organization_id = ?',
        [id, organizationId]
      ) as any[]
      return NextResponse.json(updated[0])
    }

    const data = invoiceSchema.parse(body)
    if (!(await assertCustomerInOrg(data.customerId, organizationId!))) {
      return NextResponse.json({ error: 'Invalid customer' }, { status: 400 })
    }
    const gstType = data.gstType

    const [existingRows] = await conn.execute(
      'SELECT * FROM invoices WHERE id = ? AND organization_id = ?',
      [id, organizationId]
    ) as any[]
    if (!existingRows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const existing = existingRows[0]
    const invoiceNo = existing.invoice_no

    await conn.beginTransaction()

    const [oldItems] = await conn.execute('SELECT * FROM invoice_items WHERE invoice_id = ?', [id]) as any[]
    for (const item of oldItems as any[]) {
      if (item.product_id) {
        await conn.execute(
          'UPDATE products SET current_stock = current_stock + ? WHERE id = ? AND organization_id = ?',
          [item.quantity, item.product_id, organizationId]
        )
      }
    }
    await conn.execute('DELETE FROM stock_movements WHERE reference_type = ? AND reference_id = ?', ['INVOICE', id])
    await conn.execute('DELETE FROM invoice_items WHERE invoice_id = ?', [id])

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

    const hasPaymentMode = Boolean(data.paymentMode && data.paymentMode.trim() !== '')
    const advanceAmount = Number(data.advanceAmount || 0)
    const directPaidAmount = hasPaymentMode ? totalAmount : 0
    let totalPaid = directPaidAmount + advanceAmount
    if (totalPaid > totalAmount) totalPaid = totalAmount

    const status = totalPaid >= totalAmount ? 'Paid' : totalPaid > 0 ? 'Partial' : 'Due'
    const paidAmount = totalPaid
    const balanceAmount = roundToTwo(totalAmount - paidAmount)
    const paymentMode = hasPaymentMode ? data.paymentMode : (advanceAmount > 0 ? 'ADVANCE' : null)
    const paymentRef = hasPaymentMode ? (data.paymentRef || null) : (advanceAmount > 0 ? 'Advance Adj' : null)

    const partyDetailsJson = data.partyDetails ? JSON.stringify(data.partyDetails) : null

    await conn.execute(
      `UPDATE invoices SET customer_id=?, date=?, due_date=?, status=?, gst_type=?, place_of_supply=?,
        subtotal=?, discount_amount=?, cgst_amount=?, sgst_amount=?, igst_amount=?, tax_amount=?, total_amount=?,
        paid_amount=?, balance_amount=?, payment_mode=?, payment_ref=?, notes=?, terms=?, party_details=?
       WHERE id=? AND organization_id = ?`,
      [data.customerId, data.date, data.dueDate || null, status, gstType, data.placeOfSupply || null,
       roundToTwo(subtotal), roundToTwo(totalDiscount), roundToTwo(totalCgst), roundToTwo(totalSgst), roundToTwo(totalIgst), taxAmount, totalAmount,
       paidAmount, balanceAmount, paymentMode ?? null, paymentRef ?? null, data.notes || null, data.terms || null, partyDetailsJson,
       id, organizationId]
    )

    await insertInvoiceItems(conn, id, invoiceNo, itemsWithTotals, gstType, organizationId!)

    // Sync payments table (preserve existing adjusted payments)
    await conn.execute('DELETE FROM payments WHERE (invoice_id = ? OR reference_id = ?) AND organization_id = ? AND (notes IS NULL OR notes NOT LIKE "%Adjusted%")', [id, id, organizationId])
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
          await conn.execute('UPDATE payments SET invoice_id = ?, reference_id = ?, notes = ? WHERE id = ?', [id, id, 'Adjusted against Invoice', p.id])
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

    await conn.commit()
    const [rows] = await db.execute(
      'SELECT i.*, c.name as customer_name FROM invoices i LEFT JOIN customers c ON i.customer_id = c.id WHERE i.id = ? AND i.organization_id = ?',
      [id, organizationId]
    ) as any[]
    return NextResponse.json(rows[0])
  } catch (err: any) {
    await conn.rollback()
    if (err.name === 'ZodError') return NextResponse.json({ error: err.errors }, { status: 400 })
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    conn.release()
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { error, organizationId } = await requirePermission('billing', 'delete')
  if (error) return error

  const conn = await db.getConnection()
  try {
    const [existingRows] = (await conn.execute(
      'SELECT i.*, c.name AS customer_name FROM invoices i LEFT JOIN customers c ON i.customer_id = c.id WHERE i.id = ? AND i.organization_id = ?',
      [id, organizationId]
    )) as any[]
    if (!existingRows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const fullInvoice = existingRows[0]
    const [items] = (await conn.execute('SELECT * FROM invoice_items WHERE invoice_id = ?', [
      id,
    ])) as any[]

    // Archive invoice record to Recovery before deletion
    try {
      const { archiveDeletedRecord } = await import('@/lib/recovery')
      await archiveDeletedRecord({
        organizationId: organizationId!,
        entityType: 'INVOICE',
        recordId: id,
        referenceNo: fullInvoice.invoice_no || `INV-${id.slice(0, 8)}`,
        recordData: {
          invoice: fullInvoice,
          items,
        },
      })
    } catch (archiveErr) {
      console.error('Failed to archive invoice to recovery:', archiveErr)
    }

    await conn.beginTransaction()
    for (const item of items as any[]) {
      if (item.product_id) {
        await conn.execute(
          'UPDATE products SET current_stock = current_stock + ? WHERE id = ? AND organization_id = ?',
          [item.quantity, item.product_id, organizationId]
        )
      }
    }
    await conn.execute('DELETE FROM invoice_items WHERE invoice_id = ?', [id])
    await conn.execute(
      'DELETE FROM payments WHERE (invoice_id = ? OR reference_id = ?) AND organization_id = ?',
      [id, id, organizationId]
    )
    await conn.execute('DELETE FROM invoices WHERE id = ? AND organization_id = ?', [
      id,
      organizationId,
    ])
    await conn.commit()
    return NextResponse.json({ success: true })
  } catch (err) {
    await conn.rollback()
    console.error('Delete invoice error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    conn.release()
  }
}
