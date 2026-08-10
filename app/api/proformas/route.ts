import { NextRequest, NextResponse } from 'next/server'
import db, { sqlPagination } from '@/lib/db'
import { requirePermission } from '@/lib/api-auth'
import { appendOrgFilter } from '@/lib/tenant'
import { proformaSchema } from '@/lib/validations'
import { ensureProformaSchema } from '@/lib/ensure-proforma-schema'
import { buildProformaTotals, insertProformaItems } from '@/lib/proforma-save'
import { buildDocumentNumber, buildDocumentNumberLikePattern, fetchMaxDocumentSerial } from '@/lib/document-number'
import { randomUUID } from 'crypto'
import { assertCustomerInOrg } from '@/lib/org-entity'

export async function GET(req: NextRequest) {
  const { error, organizationId } = await requirePermission('proformas', 'view')
  if (error) return error

  try {
    await ensureProformaSchema()

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    const conditions: string[] = []
    const params: any[] = []
    if (search) {
      conditions.push('(p.proforma_no LIKE ? OR c.name LIKE ?)')
      const s = `%${search}%`
      params.push(s, s)
    }
    appendOrgFilter(conditions, params, organizationId!, 'p')
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''
    const [rows] = await db.execute(
      `SELECT p.*, c.name as customer_name FROM proformas p LEFT JOIN customers c ON p.customer_id = c.id
       ${where} ORDER BY p.created_at DESC, p.proforma_no DESC ${sqlPagination(limit, offset)}`,
      params
    ) as any[]
    const [countRows] = await db.execute(
      `SELECT COUNT(*) as total FROM proformas p LEFT JOIN customers c ON p.customer_id = c.id ${where}`,
      params
    ) as any[]

    return NextResponse.json({
      proformas: rows,
      total: Number(countRows[0]?.total ?? 0),
      page,
      limit,
    })
  } catch (err: any) {
    console.error('GET /api/proformas:', err?.code, err?.message ?? err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { error, organizationId } = await requirePermission('proformas', 'create')
  if (error) return error

  const conn = await db.getConnection()
  try {
    await ensureProformaSchema()
    const body = await req.json()
    const data = proformaSchema.parse(body)
    if (!(await assertCustomerInOrg(data.customerId, organizationId!))) {
      return NextResponse.json({ error: 'Invalid customer' }, { status: 400 })
    }
    await conn.beginTransaction()

    const [settings] = await conn.execute(
      'SELECT proforma_prefix, document_number_separator, document_number_structure FROM business_settings WHERE organization_id = ? LIMIT 1',
      [organizationId]
    ) as any[]
    const prefix = settings[0]?.proforma_prefix || 'PI'
    const separator = settings[0]?.document_number_separator ?? '/'
    const structure = settings[0]?.document_number_structure ?? 'PREFIX_SERIAL_FY'
    const likePattern = buildDocumentNumberLikePattern(prefix, data.date, separator, structure)

    const gstType = data.gstType || 'CGST_SGST'
    const totals = buildProformaTotals(data.items, gstType)
    const id = randomUUID()
    const partyDetailsJson = data.partyDetails ? JSON.stringify(data.partyDetails) : null

    // Retry loop: MAX() serial + retry on duplicate to avoid ordering bugs & race conditions
    let proformaNo = ''
    let inserted = false
    for (let attempt = 0; attempt < 10 && !inserted; attempt++) {
      const maxSerial = await fetchMaxDocumentSerial(conn, 'proformas', 'proforma_no', organizationId!, likePattern, separator, structure)
      proformaNo = buildDocumentNumber(prefix, maxSerial + 1 + attempt, data.date, separator, structure)

      try {
        await conn.execute(
          `INSERT INTO proformas (id, organization_id, proforma_no, customer_id, date, valid_until, gst_type, subtotal,
            discount_amount, tax_amount, round_off, total_amount, notes, terms, party_details)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            id, organizationId, proformaNo, data.customerId, data.date,
            data.validUntil || null, gstType, totals.subtotal, totals.totalDiscount,
            totals.taxAmount, totals.roundOff, totals.grandTotal,
            data.notes || null, data.terms || null, partyDetailsJson,
          ]
        )
        inserted = true
      } catch (dupErr: any) {
        if (dupErr?.errno !== 1062) throw dupErr
      }
    }
    if (!inserted) throw new Error('Could not generate a unique proforma number after 10 attempts')

    await insertProformaItems(conn, id, totals.itemsWithTotals)

    if (data.fromQuotationId) {
      await conn.execute(
        `UPDATE quotations SET status = 'CONVERTED', converted_to_id = ? WHERE id = ? AND organization_id = ?`,
        [id, data.fromQuotationId, organizationId]
      )
    }

    await conn.commit()

    const [rows] = await db.execute(
      'SELECT p.*, c.name as customer_name FROM proformas p LEFT JOIN customers c ON p.customer_id = c.id WHERE p.id = ? AND p.organization_id = ?',
      [id, organizationId]
    ) as any[]
    return NextResponse.json(rows[0], { status: 201 })
  } catch (err: any) {
    await conn.rollback()
    if (err.name === 'ZodError') return NextResponse.json({ error: err.errors }, { status: 400 })
    console.error('POST /api/proformas:', err?.code, err?.message ?? err)
    const message =
      process.env.NODE_ENV === 'development' && err?.sqlMessage
        ? err.sqlMessage
        : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  } finally {
    conn.release()
  }
}
