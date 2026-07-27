import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { requirePermission } from '@/lib/api-auth'
import { ensurePaymentSchema } from '@/lib/ensure-payment-schema'
import { apiErrorResponse } from '@/lib/api-error'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { error, organizationId } = await requirePermission('payments', 'view')
  if (error) return error

  await ensurePaymentSchema()

  try {
    const [rows] = (await db.execute(
      `SELECT p.*,
              c.name as customer_name,
              c.email as customer_email,
              c.mobile as customer_mobile,
              c.gstin as customer_gstin,
              v.name as vendor_name,
              v.email as vendor_email,
              v.mobile as vendor_mobile,
              v.gstin as vendor_gstin,
              i.invoice_no as linked_invoice_no,
              i.total_amount as invoice_total_amount,
              pur.bill_no as linked_bill_no,
              pur.total_amount as purchase_total_amount
       FROM payments p
       LEFT JOIN customers c ON p.customer_id = c.id
       LEFT JOIN vendors v ON p.vendor_id = v.id
       LEFT JOIN invoices i ON p.invoice_id = i.id
       LEFT JOIN purchases pur ON p.purchase_id = pur.id
       WHERE p.id = ? AND p.organization_id = ?`,
      [id, organizationId]
    )) as any[]

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    return NextResponse.json({ payment: rows[0] })
  } catch (err) {
    return apiErrorResponse(err, 'GET /api/payments/[id]')
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { error, organizationId } = await requirePermission('payments', 'delete')
  if (error) return error

  const conn = await db.getConnection()
  try {
    await ensurePaymentSchema()
    await conn.beginTransaction()

    // 1. Fetch payment to delete
    const [rows] = (await conn.execute(
      `SELECT * FROM payments WHERE id = ? AND organization_id = ? FOR UPDATE`,
      [id, organizationId]
    )) as any[]

    if (rows.length === 0) {
      await conn.rollback()
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    const pay = rows[0]
    const amount = Number(pay.amount || 0)

    // 2. Revert invoice paid balance if INWARD payment linked to invoice
    if (pay.type === 'INWARD' && pay.invoice_id) {
      const [invRows] = (await conn.execute(
        `SELECT total_amount, paid_amount FROM invoices WHERE id = ? AND organization_id = ? FOR UPDATE`,
        [pay.invoice_id, organizationId]
      )) as any[]

      if (invRows.length > 0) {
        const inv = invRows[0]
        const totalAmount = Number(inv.total_amount || 0)
        const currentPaid = Number(inv.paid_amount || 0)
        const newPaid = Math.max(0, currentPaid - amount)
        const newBalance = Math.max(0, totalAmount - newPaid)
        const newStatus = newPaid <= 0 ? 'UNPAID' : (newBalance <= 0 ? 'PAID' : 'PARTIAL')

        await conn.execute(
          `UPDATE invoices SET paid_amount = ?, balance_amount = ?, status = ? WHERE id = ? AND organization_id = ?`,
          [newPaid, newBalance, newStatus, pay.invoice_id, organizationId]
        )
      }
    }

    // 3. Revert purchase paid balance if OUTWARD payment linked to purchase bill
    if (pay.type === 'OUTWARD' && pay.purchase_id) {
      const [purRows] = (await conn.execute(
        `SELECT total_amount, paid_amount FROM purchases WHERE id = ? AND organization_id = ? FOR UPDATE`,
        [pay.purchase_id, organizationId]
      )) as any[]

      if (purRows.length > 0) {
        const pur = purRows[0]
        const totalAmount = Number(pur.total_amount || 0)
        const currentPaid = Number(pur.paid_amount || 0)
        const newPaid = Math.max(0, currentPaid - amount)
        const newBalance = Math.max(0, totalAmount - newPaid)
        const newStatus = newPaid <= 0 ? 'UNPAID' : (newBalance <= 0 ? 'PAID' : 'PARTIAL')

        await conn.execute(
          `UPDATE purchases SET paid_amount = ?, balance_amount = ?, status = ? WHERE id = ? AND organization_id = ?`,
          [newPaid, newBalance, newStatus, pay.purchase_id, organizationId]
        )
      }
    }

    // 4. Delete ledger entry if exists
    try {
      await conn.execute(`DELETE FROM ledger_entries WHERE reference_id = ?`, [id])
    } catch {
      // ignore non-critical ledger error
    }

    // 5. Delete payment record
    await conn.execute(`DELETE FROM payments WHERE id = ? AND organization_id = ?`, [id, organizationId])

    await conn.commit()
    return NextResponse.json({ success: true, message: 'Payment deleted and balances reverted successfully' })
  } catch (err) {
    await conn.rollback()
    return apiErrorResponse(err, 'DELETE /api/payments/[id]')
  } finally {
    conn.release()
  }
}
