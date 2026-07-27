import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { requirePermission } from '@/lib/api-auth'
import { apiErrorResponse } from '@/lib/api-error'

export async function GET(req: NextRequest) {
  const { error, organizationId } = await requirePermission('payments', 'view')
  if (error) return error

  const { searchParams } = new URL(req.url)
  const partyType = searchParams.get('partyType') // CUSTOMER or VENDOR
  const partyId = searchParams.get('partyId')

  try {
    if (partyType === 'CUSTOMER') {
      if (partyId) {
        const [custRows] = (await db.execute(
          `SELECT name, opening_balance FROM customers WHERE id = ? AND organization_id = ?`,
          [partyId, organizationId]
        )) as any[]

        if (custRows.length === 0) {
          return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
        }

        const [dueRows] = (await db.execute(
          `SELECT COALESCE(SUM(balance_amount), 0) as total_due, COUNT(*) as unpaid_count
           FROM invoices
           WHERE customer_id = ? AND organization_id = ? AND status != 'CANCELLED' AND balance_amount > 0`,
          [partyId, organizationId]
        )) as any[]

        const [advRows] = (await db.execute(
          `SELECT COALESCE(SUM(amount), 0) as advance_balance
           FROM payments
           WHERE customer_id = ? AND organization_id = ? AND type = 'INWARD' AND invoice_id IS NULL`,
          [partyId, organizationId]
        )) as any[]

        const invoiceDue = Number(dueRows[0]?.total_due || 0)
        const openingBalance = Number(custRows[0]?.opening_balance || 0)
        const totalDue = invoiceDue + openingBalance
        const unpaidCount = Number(dueRows[0]?.unpaid_count || 0)
        const advanceBalance = Number(advRows[0]?.advance_balance || 0)

        return NextResponse.json({
          partyId,
          partyType,
          name: custRows[0].name,
          openingBalance,
          invoiceDue,
          totalDue,
          advanceBalance,
          unpaidCount,
        })
      } else {
        // Return summary of all customers with positive due amounts
        const [rows] = (await db.execute(
          `SELECT c.id, c.name, c.mobile, c.opening_balance,
                  COALESCE(SUM(CASE WHEN i.status != 'CANCELLED' AND i.balance_amount > 0 THEN i.balance_amount ELSE 0 END), 0) as invoice_due
           FROM customers c
           LEFT JOIN invoices i ON c.id = i.customer_id AND i.organization_id = ?
           WHERE c.organization_id = ?
           GROUP BY c.id, c.name, c.mobile, c.opening_balance
           ORDER BY (c.opening_balance + COALESCE(SUM(CASE WHEN i.status != 'CANCELLED' AND i.balance_amount > 0 THEN i.balance_amount ELSE 0 END), 0)) DESC`,
          [organizationId, organizationId]
        )) as any[]

        const parties = rows.map((r: any) => ({
          id: r.id,
          name: r.name,
          mobile: r.mobile,
          totalDue: Number(r.opening_balance || 0) + Number(r.invoice_due || 0),
        }))

        return NextResponse.json({ parties })
      }
    } else if (partyType === 'VENDOR') {
      if (partyId) {
        const [vendRows] = (await db.execute(
          `SELECT name, opening_balance FROM vendors WHERE id = ? AND organization_id = ?`,
          [partyId, organizationId]
        )) as any[]

        if (vendRows.length === 0) {
          return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
        }

        const [dueRows] = (await db.execute(
          `SELECT COALESCE(SUM(balance_amount), 0) as total_due, COUNT(*) as unpaid_count
           FROM purchases
           WHERE vendor_id = ? AND organization_id = ? AND status != 'CANCELLED' AND balance_amount > 0`,
          [partyId, organizationId]
        )) as any[]

        const [advRows] = (await db.execute(
          `SELECT COALESCE(SUM(amount), 0) as advance_balance
           FROM payments
           WHERE vendor_id = ? AND organization_id = ? AND type = 'OUTWARD' AND purchase_id IS NULL`,
          [partyId, organizationId]
        )) as any[]

        const purchaseDue = Number(dueRows[0]?.total_due || 0)
        const openingBalance = Number(vendRows[0]?.opening_balance || 0)
        const totalDue = purchaseDue + openingBalance
        const unpaidCount = Number(dueRows[0]?.unpaid_count || 0)
        const advanceBalance = Number(advRows[0]?.advance_balance || 0)

        return NextResponse.json({
          partyId,
          partyType,
          name: vendRows[0].name,
          openingBalance,
          purchaseDue,
          totalDue,
          advanceBalance,
          unpaidCount,
        })
      } else {
        const [rows] = (await db.execute(
          `SELECT v.id, v.name, v.mobile, v.opening_balance,
                  COALESCE(SUM(CASE WHEN p.status != 'CANCELLED' AND p.balance_amount > 0 THEN p.balance_amount ELSE 0 END), 0) as purchase_due
           FROM vendors v
           LEFT JOIN purchases p ON v.id = p.vendor_id AND p.organization_id = ?
           WHERE v.organization_id = ?
           GROUP BY v.id, v.name, v.mobile, v.opening_balance
           ORDER BY (v.opening_balance + COALESCE(SUM(CASE WHEN p.status != 'CANCELLED' AND p.balance_amount > 0 THEN p.balance_amount ELSE 0 END), 0)) DESC`,
          [organizationId, organizationId]
        )) as any[]

        const parties = rows.map((r: any) => ({
          id: r.id,
          name: r.name,
          mobile: r.mobile,
          totalDue: Number(r.opening_balance || 0) + Number(r.purchase_due || 0),
        }))

        return NextResponse.json({ parties })
      }
    } else {
      return NextResponse.json({ error: 'Invalid partyType (must be CUSTOMER or VENDOR)' }, { status: 400 })
    }
  } catch (err) {
    return apiErrorResponse(err, 'GET /api/payments/party-due')
  }
}
