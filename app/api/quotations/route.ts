import { NextRequest, NextResponse } from 'next/server'
import db, { sqlPagination } from '@/lib/db'
import { requirePermission } from '@/lib/api-auth'
import { appendOrgFilter } from '@/lib/tenant'
import { quotationSchema } from '@/lib/validations'
import { ensureQuotationSchema } from '@/lib/ensure-quotation-schema'
import { buildQuotationTotals, insertQuotationItems } from '@/lib/quotation-save'
import { buildDocumentNumberPrefix, documentSerialSubstringStart, nextDocumentNumber } from '@/lib/document-number'
import { randomUUID } from 'crypto'
import { assertCustomerInOrg } from '@/lib/org-entity'

export async function GET(req: NextRequest) {
  const { error, organizationId } = await requirePermission('quotations', 'view')
  if (error) return error

  try {
    await ensureQuotationSchema()

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    const conditions: string[] = []
    const params: any[] = []
    if (search) {
      conditions.push('(q.quotation_no LIKE ? OR c.name LIKE ?)')
      const s = `%${search}%`
      params.push(s, s)
    }
    appendOrgFilter(conditions, params, organizationId!, 'q')
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''
    const [rows] = await db.execute(
      `SELECT q.*, c.name as customer_name FROM quotations q LEFT JOIN customers c ON q.customer_id = c.id
       ${where} ORDER BY q.created_at DESC, q.quotation_no DESC ${sqlPagination(limit, offset)}`,
      params
    ) as any[]
    const [countRows] = await db.execute(
      `SELECT COUNT(*) as total FROM quotations q LEFT JOIN customers c ON q.customer_id = c.id ${where}`,
      params
    ) as any[]

    return NextResponse.json({
      quotations: rows,
      total: Number(countRows[0]?.total ?? 0),
      page,
      limit,
    })
  } catch (err: any) {
    console.error('GET /api/quotations:', err?.code, err?.message ?? err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { error, organizationId } = await requirePermission('quotations', 'create')
  if (error) return error

  const conn = await db.getConnection()
  try {
    await ensureQuotationSchema()
    const body = await req.json()
    const data = quotationSchema.parse(body)
    if (!(await assertCustomerInOrg(data.customerId, organizationId!))) {
      return NextResponse.json({ error: 'Invalid customer' }, { status: 400 })
    }
    await conn.beginTransaction()

    const [settings] = await conn.execute(
      'SELECT quotation_prefix FROM business_settings WHERE organization_id = ? LIMIT 1',
      [organizationId]
    ) as any[]
    const prefix = settings[0]?.quotation_prefix || 'QT'
    const numberPrefix = buildDocumentNumberPrefix(prefix, data.date)

    const gstType = data.gstType || 'CGST_SGST'
    const totals = buildQuotationTotals(data.items, gstType)
    const id = randomUUID()
    const partyDetailsJson = data.partyDetails ? JSON.stringify(data.partyDetails) : null

    // Retry loop: MAX() serial + retry on duplicate to avoid ordering bugs & race conditions
    let quotationNo = ''
    let inserted = false
    for (let attempt = 0; attempt < 10 && !inserted; attempt++) {
      const [maxRow] = await conn.execute(
        `SELECT MAX(CAST(SUBSTRING(quotation_no, ?) AS UNSIGNED)) AS maxSerial
         FROM quotations WHERE organization_id = ? AND quotation_no LIKE ?`,
        [documentSerialSubstringStart(numberPrefix), organizationId, `${numberPrefix}%`]
      ) as any[]
      const maxSerial: number = Number(maxRow[0]?.maxSerial) || 0
      quotationNo = `${numberPrefix}${maxSerial + 1 + attempt}`

      try {
        await conn.execute(
          `INSERT INTO quotations (id, organization_id, quotation_no, customer_id, date, valid_until, gst_type, subtotal,
            discount_amount, tax_amount, round_off, total_amount, notes, terms, party_details)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            id, organizationId, quotationNo, data.customerId, data.date,
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
    if (!inserted) throw new Error('Could not generate a unique quotation number after 10 attempts')

    await insertQuotationItems(conn, id, totals.itemsWithTotals)
    await conn.commit()

    const [rows] = await db.execute(
      'SELECT q.*, c.name as customer_name FROM quotations q LEFT JOIN customers c ON q.customer_id = c.id WHERE q.id = ? AND q.organization_id = ?',
      [id, organizationId]
    ) as any[]
    return NextResponse.json(rows[0], { status: 201 })
  } catch (err: any) {
    await conn.rollback()
    if (err.name === 'ZodError') return NextResponse.json({ error: err.errors }, { status: 400 })
    console.error('POST /api/quotations:', err?.code, err?.message ?? err)
    const message =
      process.env.NODE_ENV === 'development' && err?.sqlMessage
        ? err.sqlMessage
        : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  } finally {
    conn.release()
  }
}
