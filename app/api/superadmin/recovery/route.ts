import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { requireSuperAdmin } from '@/lib/superadmin-auth'
import { ensureRecoverySchema } from '@/lib/recovery'

export async function GET(req: NextRequest) {
  const { error } = await requireSuperAdmin()
  if (error) return error

  await ensureRecoverySchema()

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search')?.trim() || ''
  const entityType = searchParams.get('entityType')?.trim() || ''
  const organizationId = searchParams.get('organizationId')?.trim() || ''

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conditions: string[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const params: any[] = []

  if (search) {
    conditions.push(
      '(dr.reference_no LIKE ? OR dr.record_id LIKE ? OR o.name LIKE ? OR dr.deleted_by_user_name LIKE ?)'
    )
    const term = `%${search}%`
    params.push(term, term, term, term)
  }

  if (entityType && entityType !== 'ALL') {
    conditions.push('dr.entity_type = ?')
    params.push(entityType)
  }

  if (organizationId && organizationId !== 'ALL') {
    conditions.push('dr.organization_id = ?')
    params.push(organizationId)
  }

  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''

  // Query records
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [rows] = (await db.execute(
    `SELECT dr.*, o.name AS organization_name
     FROM deleted_records dr
     LEFT JOIN organizations o ON dr.organization_id = o.id
     ${whereClause}
     ORDER BY dr.deleted_at DESC
     LIMIT 500`,
    params
  )) as [Record<string, unknown>[], unknown]

  // Query summary breakdown stats matching filters
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [statsRows] = (await db.execute(
    `SELECT
      COUNT(*) AS total_deleted,
      SUM(CASE WHEN dr.entity_type = 'INVOICE' THEN 1 ELSE 0 END) AS total_invoices,
      SUM(CASE WHEN dr.entity_type = 'PURCHASE' THEN 1 ELSE 0 END) AS total_purchases,
      SUM(CASE WHEN dr.entity_type = 'PRODUCT' THEN 1 ELSE 0 END) AS total_products,
      SUM(CASE WHEN dr.entity_type IN ('CUSTOMER', 'VENDOR') THEN 1 ELSE 0 END) AS total_parties
    FROM deleted_records dr
    LEFT JOIN organizations o ON dr.organization_id = o.id
    ${whereClause}`,
    params
  )) as [Record<string, unknown>[], unknown]

  // Query list of organizations that have deleted records (or all organizations)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [orgs] = (await db.execute(
    `SELECT DISTINCT o.id, o.name
     FROM organizations o
     JOIN deleted_records dr ON o.id = dr.organization_id
     ORDER BY o.name ASC`
  )) as [Record<string, unknown>[], unknown]

  return NextResponse.json({
    data: rows,
    organizations: orgs,
    summary: statsRows[0] || {
      total_deleted: 0,
      total_invoices: 0,
      total_purchases: 0,
      total_products: 0,
      total_parties: 0,
    },
  })
}

export async function POST(req: NextRequest) {
  const { error } = await requireSuperAdmin()
  if (error) return error

  await ensureRecoverySchema()

  try {
    const body = await req.json()
    const { action, id } = body

    if (action !== 'restore' || !id) {
      return NextResponse.json({ error: 'Invalid action or ID' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [rows] = (await db.execute(
      'SELECT * FROM deleted_records WHERE id = ?',
      [id]
    )) as [Record<string, unknown>[], unknown]

    if (!rows[0]) {
      return NextResponse.json({ error: 'Recovery record not found' }, { status: 404 })
    }

    const record = rows[0]
    const entityType = String(record.entity_type)
    const orgId = String(record.organization_id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let recordData: any = record.record_data
    if (typeof recordData === 'string') {
      try {
        recordData = JSON.parse(recordData)
      } catch {
        recordData = {}
      }
    }

    const conn = await db.getConnection()
    try {
      await conn.beginTransaction()

      if (entityType === 'INVOICE') {
        const inv = recordData.invoice || recordData
        const items = recordData.items || []

        // Check if invoice already exists
        const [existing] = (await conn.execute(
          'SELECT id FROM invoices WHERE id = ?',
          [inv.id]
        )) as [Record<string, unknown>[], unknown]

        if (!existing[0]) {
          await conn.execute(
            `INSERT INTO invoices (
              id, organization_id, invoice_no, date, due_date, customer_id, gst_type,
              subtotal, discount_amount, cgst_amount, sgst_amount, igst_amount, tax_amount,
              round_off, total_amount, paid_amount, balance_amount, payment_mode, notes, terms, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              inv.id,
              orgId,
              inv.invoice_no,
              inv.date,
              inv.due_date || null,
              inv.customer_id,
              inv.gst_type || 'CGST_SGST',
              inv.subtotal || 0,
              inv.discount_amount || 0,
              inv.cgst_amount || 0,
              inv.sgst_amount || 0,
              inv.igst_amount || 0,
              inv.tax_amount || 0,
              inv.round_off || 0,
              inv.total_amount || 0,
              inv.paid_amount || 0,
              inv.balance_amount || inv.total_amount || 0,
              inv.payment_mode || null,
              inv.notes || null,
              inv.terms || null,
              inv.status || 'PENDING',
              inv.created_at || new Date(),
            ]
          )

          // Re-insert invoice items
          for (const item of items) {
            await conn.execute(
              `INSERT INTO invoice_items (
                id, invoice_id, product_id, description, quantity, rate, discount,
                gst_rate, cgst_rate, sgst_rate, igst_rate, cgst_amount, sgst_amount, igst_amount, gst_amount, amount, sort_order
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                item.id,
                inv.id,
                item.product_id || null,
                item.description || null,
                item.quantity,
                item.rate,
                item.discount || 0,
                item.gst_rate || 0,
                item.cgst_rate || 0,
                item.sgst_rate || 0,
                item.igst_rate || 0,
                item.cgst_amount || 0,
                item.sgst_amount || 0,
                item.igst_amount || 0,
                item.gst_amount || 0,
                item.amount || 0,
                item.sort_order || 1,
              ]
            )
          }
        }
      } else if (entityType === 'PURCHASE') {
        const pur = recordData.purchase || recordData
        const items = recordData.items || []

        const [existing] = (await conn.execute(
          'SELECT id FROM purchases WHERE id = ?',
          [pur.id]
        )) as [Record<string, unknown>[], unknown]

        if (!existing[0]) {
          await conn.execute(
            `INSERT INTO purchases (
              id, organization_id, vendor_id, date, due_date, gst_type, bill_no, bill_date,
              subtotal, discount_amount, cgst_amount, sgst_amount, igst_amount, tax_amount,
              round_off, total_amount, paid_amount, balance_amount, payment_mode, payment_ref, notes, terms, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              pur.id,
              orgId,
              pur.vendor_id,
              pur.date,
              pur.due_date || null,
              pur.gst_type || 'CGST_SGST',
              pur.bill_no || null,
              pur.bill_date || null,
              pur.subtotal || 0,
              pur.discount_amount || 0,
              pur.cgst_amount || 0,
              pur.sgst_amount || 0,
              pur.igst_amount || 0,
              pur.tax_amount || 0,
              pur.round_off || 0,
              pur.total_amount || 0,
              pur.paid_amount || 0,
              pur.balance_amount || pur.total_amount || 0,
              pur.payment_mode || null,
              pur.payment_ref || null,
              pur.notes || null,
              pur.terms || null,
              pur.status || 'PENDING',
              pur.created_at || new Date(),
            ]
          )

          for (const item of items) {
            await conn.execute(
              `INSERT INTO purchase_items (
                id, purchase_id, product_id, description, quantity, rate, discount,
                gst_rate, cgst_rate, sgst_rate, igst_rate, cgst_amount, sgst_amount, igst_amount, gst_amount, amount, sort_order
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                item.id,
                pur.id,
                item.product_id || null,
                item.description || null,
                item.quantity,
                item.rate,
                item.discount || 0,
                item.gst_rate || 0,
                item.cgst_rate || 0,
                item.sgst_rate || 0,
                item.igst_rate || 0,
                item.cgst_amount || 0,
                item.sgst_amount || 0,
                item.igst_amount || 0,
                item.gst_amount || 0,
                item.amount || 0,
                item.sort_order || 1,
              ]
            )
          }
        }
      } else if (entityType === 'PRODUCT') {
        const prod = recordData

        const [existing] = (await conn.execute(
          'SELECT id FROM products WHERE id = ?',
          [prod.id]
        )) as [Record<string, unknown>[], unknown]

        if (!existing[0]) {
          await conn.execute(
            `INSERT INTO products (
              id, organization_id, name, sku, barcode, hsn_code, sac_code, description,
              category_id, brand_id, unit_id, purchase_price, selling_price, mrp,
              gst_rate, gst_type, current_stock, low_stock_alert, discount, is_active, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              prod.id,
              orgId,
              prod.name,
              prod.sku || null,
              prod.barcode || null,
              prod.hsn_code || null,
              prod.sac_code || null,
              prod.description || null,
              prod.category_id || null,
              prod.brand_id || null,
              prod.unit_id || null,
              prod.purchase_price || 0,
              prod.selling_price || 0,
              prod.mrp || null,
              prod.gst_rate || 0,
              prod.gst_type || 'CGST_SGST',
              prod.current_stock || 0,
              prod.low_stock_alert || 10,
              prod.discount || null,
              prod.is_active ?? 1,
              prod.created_at || new Date(),
            ]
          )
        } else {
          // If soft deleted / inactive, re-enable
          await conn.execute(
            'UPDATE products SET is_active = 1 WHERE id = ? AND organization_id = ?',
            [prod.id, orgId]
          )
        }
      } else if (entityType === 'CUSTOMER') {
        const cust = recordData
        const [existing] = (await conn.execute('SELECT id FROM customers WHERE id = ?', [
          cust.id,
        ])) as [Record<string, unknown>[], unknown]

        if (!existing[0]) {
          await conn.execute(
            `INSERT INTO customers (
              id, organization_id, name, contact_person, email, mobile, phone, gstin, pan,
              billing_address, billing_city, billing_state, billing_pincode,
              shipping_address, shipping_city, shipping_state, shipping_pincode,
              credit_limit, opening_balance, is_active, notes, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              cust.id,
              orgId,
              cust.name,
              cust.contact_person || null,
              cust.email || null,
              cust.mobile || null,
              cust.phone || null,
              cust.gstin || null,
              cust.pan || null,
              cust.billing_address || null,
              cust.billing_city || null,
              cust.billing_state || null,
              cust.billing_pincode || null,
              cust.shipping_address || null,
              cust.shipping_city || null,
              cust.shipping_state || null,
              cust.shipping_pincode || null,
              cust.credit_limit || 0,
              cust.opening_balance || 0,
              cust.is_active ?? 1,
              cust.notes || null,
              cust.created_at || new Date(),
            ]
          )
        } else {
          await conn.execute(
            'UPDATE customers SET is_active = 1 WHERE id = ? AND organization_id = ?',
            [cust.id, orgId]
          )
        }
      } else if (entityType === 'VENDOR') {
        const vend = recordData
        const [existing] = (await conn.execute('SELECT id FROM vendors WHERE id = ?', [
          vend.id,
        ])) as [Record<string, unknown>[], unknown]

        if (!existing[0]) {
          await conn.execute(
            `INSERT INTO vendors (
              id, organization_id, name, contact_person, email, mobile, phone, gstin, pan,
              address, city, state, pincode, credit_limit, opening_balance, is_active, notes, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              vend.id,
              orgId,
              vend.name,
              vend.contact_person || null,
              vend.email || null,
              vend.mobile || null,
              vend.phone || null,
              vend.gstin || null,
              vend.pan || null,
              vend.address || null,
              vend.city || null,
              vend.state || null,
              vend.pincode || null,
              vend.credit_limit || 0,
              vend.opening_balance || 0,
              vend.is_active ?? 1,
              vend.notes || null,
              vend.created_at || new Date(),
            ]
          )
        } else {
          await conn.execute(
            'UPDATE vendors SET is_active = 1 WHERE id = ? AND organization_id = ?',
            [vend.id, orgId]
          )
        }
      }

      // Remove from deleted_records once restored
      await conn.execute('DELETE FROM deleted_records WHERE id = ?', [id])
      await conn.commit()

      return NextResponse.json({ success: true, message: 'Record restored successfully' })
    } catch (err) {
      await conn.rollback()
      console.error('Error restoring deleted record:', err)
      return NextResponse.json({ error: 'Failed to restore record' }, { status: 500 })
    } finally {
      conn.release()
    }
  } catch (err) {
    console.error('Error in POST /api/superadmin/recovery:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const { error } = await requireSuperAdmin()
  if (error) return error

  await ensureRecoverySchema()

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const purgeAll = searchParams.get('purgeAll') === 'true'

  if (purgeAll) {
    await db.execute('DELETE FROM deleted_records')
    return NextResponse.json({ success: true, message: 'All recovery logs purged' })
  }

  if (!id) {
    return NextResponse.json({ error: 'Missing record ID' }, { status: 400 })
  }

  await db.execute('DELETE FROM deleted_records WHERE id = ?', [id])
  return NextResponse.json({ success: true, message: 'Record permanently purged' })
}
