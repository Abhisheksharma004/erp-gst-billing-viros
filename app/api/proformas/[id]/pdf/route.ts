import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { requirePermission } from '@/lib/api-auth'
import { ensureBusinessSettingsBankingColumns } from '@/lib/ensure-business-settings-schema'
import { ensureProformaSchema } from '@/lib/ensure-proforma-schema'
import { generateProformaPdfBuffer } from '@/lib/quotation-pdf'
import { buildPdfParties, parseQuotationPartyDetails } from '@/lib/quotation-party'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { error, organizationId } = await requirePermission('proformas', 'view')
  if (error) return error

  try {
    await Promise.all([ensureBusinessSettingsBankingColumns(), ensureProformaSchema()])

    const [proformaRows] = await db.execute(
      `SELECT p.id, p.proforma_no, p.customer_id, p.date, p.valid_until, p.gst_type,
              p.subtotal, p.discount_amount, p.tax_amount, p.round_off, p.total_amount,
              p.notes, p.terms, p.party_details
       FROM proformas p
       WHERE p.id = ? AND p.organization_id = ?`,
      [id, organizationId]
    ) as any[]

    const proforma = proformaRows[0]
    if (!proforma) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const [customerRows] = await db.execute(
      `SELECT name, contact_person, phone, mobile, gstin, pan,
              billing_address, billing_city, billing_state,
              shipping_address, shipping_city, shipping_state
       FROM customers
       WHERE id = ? AND organization_id = ?`,
      [proforma.customer_id, organizationId]
    ) as any[]

    const customerRow = customerRows[0] || {}
    const partyDetails = parseQuotationPartyDetails(proforma.party_details)
    const parties = buildPdfParties(customerRow, partyDetails)

    const [itemRows] = await db.execute(
      `SELECT pi.id,
              pi.proforma_id,
              pi.product_id,
              COALESCE(NULLIF(TRIM(pi.description), ''), p.description, '') as description,
              pi.quantity,
              pi.rate,
              pi.discount,
              pi.gst_rate,
              pi.gst_amount,
              pi.amount,
              COALESCE(NULLIF(TRIM(p.name), ''), NULLIF(TRIM(pi.description), ''), 'Product') as product_name,
              p.hsn_code,
              p.sac_code,
              u.short_name as unit_short
       FROM proforma_items pi
       LEFT JOIN products p ON pi.product_id = p.id
       LEFT JOIN units u ON p.unit_id = u.id
       WHERE pi.proforma_id = ?
       ORDER BY pi.sort_order ASC, pi.id ASC`,
      [id]
    ) as any[]

    const [settingsRows] = await db.execute(`
      SELECT company_name, gstin, pan, address, city, state, pincode, phone, email, website, logo,
             bank_name, bank_account, bank_ifsc, bank_branch, bank_micr, upi_id,
             terms_condition, quotation_terms, proforma_terms
      FROM business_settings WHERE organization_id = ? LIMIT 1
    `, [organizationId]) as any[]

    const s = settingsRows[0] || {}

    const pdfBuffer = generateProformaPdfBuffer(
      {
        proforma_no: proforma.proforma_no,
        date: proforma.date,
        valid_until: proforma.valid_until,
        gst_type: proforma.gst_type,
        subtotal: Number(proforma.subtotal),
        discount_amount: Number(proforma.discount_amount),
        tax_amount: Number(proforma.tax_amount),
        round_off: Number(proforma.round_off) || 0,
        total_amount: Number(proforma.total_amount),
        terms: proforma.terms,
        notes: proforma.notes,
        customer: parties.buyer,
        consignee: parties.consignee,
        items: itemRows,
      },
      {
        companyName: s.company_name || 'Company Name',
        gstin: s.gstin,
        pan: s.pan,
        address: s.address,
        city: s.city,
        state: s.state,
        pincode: s.pincode,
        phone: s.phone,
        email: s.email,
        website: s.website,
        logo: s.logo,
        bankName: s.bank_name,
        bankAccount: s.bank_account,
        bankIfsc: s.bank_ifsc,
        bankBranch: s.bank_branch,
        bankMicr: s.bank_micr,
        upiId: s.upi_id,
        termsCondition: s.proforma_terms || s.terms_condition,
      }
    )

    const filename = `${proforma.proforma_no.replace(/[/\\?%*:|"<>]/g, '-')}.pdf`

    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('GET /api/proformas/[id]/pdf:', err)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
