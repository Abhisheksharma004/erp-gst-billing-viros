import { NextRequest, NextResponse } from 'next/server'
import db, { sqlPagination } from '@/lib/db'
import { requirePermission } from '@/lib/api-auth'
import { appendOrgFilter } from '@/lib/tenant'
import { purchaseOrderSchema } from '@/lib/validations'
import { ensureDocumentTermsColumns } from '@/lib/ensure-purchase-schema'
import { normalizePurchaseDocumentItem } from '@/lib/purchase-include-pricing'
import { buildDocumentNumber, buildDocumentNumberLikePattern, fetchMaxDocumentSerial } from '@/lib/document-number'
import { randomUUID } from 'crypto'
import { assertVendorInOrg } from '@/lib/org-entity'

function computeItemTotals(item: any, gstType = 'CGST_SGST') {
  const taxable = item.quantity * item.rate * (1 - (item.discount || 0) / 100)
  let cgst = 0, sgst = 0, igst = 0
  if (gstType === 'CGST_SGST') { cgst = taxable * item.gstRate / 200; sgst = cgst }
  else if (gstType === 'IGST') { igst = taxable * item.gstRate / 100 }
  const total = taxable + cgst + sgst + igst
  const discAmt = item.quantity * item.rate - taxable
  return { taxable, cgst, sgst, igst, total, discAmt }
}

export async function GET(req: NextRequest) {
  const { error, organizationId } = await requirePermission('purchase-orders', 'view')
  if (error) return error

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || ''
  const status = searchParams.get('status')
  const fromDate = searchParams.get('fromDate')
  const toDate = searchParams.get('toDate')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = (page - 1) * limit

  const conditions: string[] = []
  const params: any[] = []
  if (search) { conditions.push('(po.po_no LIKE ? OR v.name LIKE ?)'); const s = `%${search}%`; params.push(s, s) }
  if (status) { conditions.push('po.status = ?'); params.push(status) }
  if (fromDate) { conditions.push('po.date >= ?'); params.push(fromDate) }
  if (toDate) { conditions.push('po.date <= ?'); params.push(toDate) }
  appendOrgFilter(conditions, params, organizationId!, 'po')

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''
  const [rows] = await db.execute(
    `SELECT po.*, v.name as vendor_name FROM purchase_orders po LEFT JOIN vendors v ON po.vendor_id = v.id
     ${where} ORDER BY po.date DESC ${sqlPagination(limit, offset)}`,
    params
  ) as any[]
  const [countRows] = await db.execute(
    `SELECT COUNT(*) as total FROM purchase_orders po LEFT JOIN vendors v ON po.vendor_id = v.id ${where}`, params
  ) as any[]

  return NextResponse.json({ purchaseOrders: rows, total: countRows[0].total, page, limit })
}

export async function POST(req: NextRequest) {
  const { error, organizationId } = await requirePermission('purchase-orders', 'create')
  if (error) return error

  const conn = await db.getConnection()
  try {
    await ensureDocumentTermsColumns()
    const body = await req.json()
    const data = purchaseOrderSchema.parse(body)
    if (!(await assertVendorInOrg(data.vendorId, organizationId!))) {
      return NextResponse.json({ error: 'Invalid vendor' }, { status: 400 })
    }
    const includePricing = data.includePricing
    const gstType = data.gstType
    await conn.beginTransaction()

    const [settings] = await conn.execute(
      'SELECT purchase_order_prefix, document_number_separator, document_number_structure FROM business_settings WHERE organization_id = ? LIMIT 1',
      [organizationId]
    ) as any[]
    const prefix = settings[0]?.purchase_order_prefix || 'PO'
    const separator = settings[0]?.document_number_separator ?? '/'
    const structure = settings[0]?.document_number_structure ?? 'PREFIX_SERIAL_FY'
    const likePattern = buildDocumentNumberLikePattern(prefix, data.date, separator, structure)

    let subtotal = 0, totalDiscount = 0, totalTaxable = 0, totalCgst = 0, totalSgst = 0, totalIgst = 0, grandTotal = 0
    const itemsWithTotals = data.items.map((item: any) => {
      const normalized = normalizePurchaseDocumentItem(item, includePricing)
      const t = computeItemTotals(normalized, gstType)
      subtotal += normalized.quantity * normalized.rate
      totalDiscount += t.discAmt
      totalTaxable += t.taxable
      totalCgst += t.cgst
      totalSgst += t.sgst
      totalIgst += t.igst
      grandTotal += t.total
      return { ...normalized, ...t }
    })
    const id = randomUUID()

    // Retry loop: MAX() serial + retry on duplicate to avoid ordering bugs & race conditions
    let poNo = ''
    let inserted = false
    for (let attempt = 0; attempt < 10 && !inserted; attempt++) {
      const maxSerial = await fetchMaxDocumentSerial(conn, 'purchase_orders', 'po_no', organizationId!, likePattern, separator, structure)
      poNo = buildDocumentNumber(prefix, maxSerial + 1 + attempt, data.date, separator, structure)

      try {
        await conn.execute(
          `INSERT INTO purchase_orders (id, organization_id, po_no, vendor_id, date, expected_date, subtotal,
            discount_amount, tax_amount, total_amount, notes, terms, include_pricing, status)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [id, organizationId, poNo, data.vendorId, data.date, data.expectedDate || null,
           subtotal, totalDiscount, totalCgst + totalSgst + totalIgst, grandTotal,
           data.notes || null, data.terms || null, includePricing ? 1 : 0, 'PENDING']
        )
        inserted = true
      } catch (dupErr: any) {
        if (dupErr?.errno !== 1062) throw dupErr
      }
    }
    if (!inserted) throw new Error('Could not generate a unique PO number after 10 attempts')

    for (let idx = 0; idx < itemsWithTotals.length; idx++) {
      const item = itemsWithTotals[idx]
      await conn.execute(
        `INSERT INTO purchase_order_items (id, purchase_order_id, product_id, description, quantity, received_qty,
          rate, discount, gst_rate, gst_amount, amount, sort_order)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [randomUUID(), id, item.productId || null, item.description || null,
         item.quantity, 0, item.rate, item.discount || 0, item.gstRate,
         item.cgst + item.sgst + item.igst, item.total, idx + 1]
      )
    }

    await conn.commit()
    const [rows] = await db.execute(
      'SELECT po.*, v.name as vendor_name FROM purchase_orders po LEFT JOIN vendors v ON po.vendor_id = v.id WHERE po.id = ? AND po.organization_id = ?',
      [id, organizationId]
    ) as any[]
    return NextResponse.json(rows[0], { status: 201 })
  } catch (err: any) {
    await conn.rollback()
    if (err.name === 'ZodError') return NextResponse.json({ error: err.errors }, { status: 400 })
    console.error('[POST /api/purchase-orders] error:', err?.sqlMessage ?? err?.message ?? err)
    const message = err?.sqlMessage || err?.message || 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  } finally {
    conn.release()
  }
}
