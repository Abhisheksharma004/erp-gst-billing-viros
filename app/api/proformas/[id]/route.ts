import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { requirePermission } from '@/lib/api-auth'
import { proformaSchema } from '@/lib/validations'
import { ensureProformaSchema } from '@/lib/ensure-proforma-schema'
import { buildProformaTotals, insertProformaItems } from '@/lib/proforma-save'
import { assertCustomerInOrg } from '@/lib/org-entity'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { error, organizationId } = await requirePermission('proformas', 'view')
  if (error) return error

  await ensureProformaSchema()

  const [rows] = await db.execute(
    `SELECT p.*,
      c.name as customer_name,
      c.contact_person as customer_contact_person,
      c.phone as customer_phone,
      c.mobile as customer_mobile,
      c.gstin as customer_gstin,
      c.pan as customer_pan,
      c.billing_address as customer_address,
      c.billing_city as customer_city,
      c.billing_state as customer_state,
      c.billing_pincode as customer_pincode,
      c.shipping_address as customer_shipping_address,
      c.shipping_city as customer_shipping_city,
      c.shipping_state as customer_shipping_state
     FROM proformas p
     LEFT JOIN customers c ON p.customer_id = c.id
     WHERE p.id = ? AND p.organization_id = ?`,
    [id, organizationId]
  ) as any[]
  if (!rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const [items] = await db.execute('SELECT * FROM proforma_items WHERE proforma_id = ? ORDER BY sort_order ASC, id ASC', [id]) as any[]
  return NextResponse.json({ ...rows[0], items })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { error, organizationId } = await requirePermission('proformas', 'edit')
  if (error) return error

  const conn = await db.getConnection()
  try {
    await ensureProformaSchema()
    const body = await req.json()

    if (!body.items || !Array.isArray(body.items)) {
      const [rows] = await conn.execute(
        'SELECT * FROM proformas WHERE id = ? AND organization_id = ?',
        [id, organizationId]
      ) as any[]
      if (!rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })

      const { notes } = body
      await conn.execute(
        'UPDATE proformas SET notes = COALESCE(?, notes) WHERE id = ? AND organization_id = ?',
        [notes || null, id, organizationId]
      )
      const [updated] = await db.execute(
        'SELECT p.*, c.name as customer_name FROM proformas p LEFT JOIN customers c ON p.customer_id = c.id WHERE p.id = ? AND p.organization_id = ?',
        [id, organizationId]
      ) as any[]
      return NextResponse.json(updated[0])
    }

    const data = proformaSchema.parse(body)
    if (!(await assertCustomerInOrg(data.customerId, organizationId!))) {
      return NextResponse.json({ error: 'Invalid customer' }, { status: 400 })
    }
    const gstType = data.gstType || 'CGST_SGST'

    const [existingRows] = await conn.execute(
      'SELECT * FROM proformas WHERE id = ? AND organization_id = ?',
      [id, organizationId]
    ) as any[]
    if (!existingRows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await conn.beginTransaction()

    await conn.execute('DELETE FROM proforma_items WHERE proforma_id = ?', [id])

    const totals = buildProformaTotals(data.items, gstType)
    const partyDetailsJson = data.partyDetails ? JSON.stringify(data.partyDetails) : null

    await conn.execute(
      `UPDATE proformas SET customer_id=?, date=?, valid_until=?, gst_type=?, subtotal=?,
        discount_amount=?, tax_amount=?, round_off=?, total_amount=?, notes=?, terms=?, party_details=?
       WHERE id=? AND organization_id = ?`,
      [
        data.customerId,
        data.date,
        data.validUntil || null,
        gstType,
        totals.subtotal,
        totals.totalDiscount,
        totals.taxAmount,
        totals.roundOff,
        totals.grandTotal,
        data.notes || null,
        data.terms || null,
        partyDetailsJson,
        id,
        organizationId,
      ]
    )

    await insertProformaItems(conn, id, totals.itemsWithTotals)
    await conn.commit()

    const [rows] = await db.execute(
      'SELECT p.*, c.name as customer_name FROM proformas p LEFT JOIN customers c ON p.customer_id = c.id WHERE p.id = ? AND p.organization_id = ?',
      [id, organizationId]
    ) as any[]
    return NextResponse.json(rows[0])
  } catch (err: any) {
    await conn.rollback()
    if (err.name === 'ZodError') return NextResponse.json({ error: err.errors }, { status: 400 })
    console.error('PUT /api/proformas/[id]:', err?.code, err?.message ?? err)
    const message =
      process.env.NODE_ENV === 'development' && err?.sqlMessage
        ? err.sqlMessage
        : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  } finally {
    conn.release()
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { error, organizationId } = await requirePermission('proformas', 'delete')
  if (error) return error

  const [existing] = await db.execute(
    'SELECT id FROM proformas WHERE id = ? AND organization_id = ?',
    [id, organizationId]
  ) as any[]
  if (!existing[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.execute('DELETE FROM proforma_items WHERE proforma_id = ?', [id])
  await db.execute('DELETE FROM proformas WHERE id = ? AND organization_id = ?', [id, organizationId])
  return NextResponse.json({ success: true })
}
