import { NextRequest, NextResponse } from 'next/server'
import db, { sqlLimitClause } from '@/lib/db'
import { requirePermission } from '@/lib/api-auth'
import { appendOrgFilter } from '@/lib/tenant'

function mapInvoiceRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    invoiceNo: row.invoice_no,
    date: row.date,
    status: row.status,
    taxableAmount: Number(row.subtotal || 0),
    taxAmount: Number(row.tax_amount || 0),
    totalAmount: Number(row.total_amount || 0),
    paidAmount: Number(row.paid_amount || 0),
    balanceAmount: Number(row.balance_amount || 0),
    cgstAmount: Number(row.cgst_amount || 0),
    sgstAmount: Number(row.sgst_amount || 0),
    igstAmount: Number(row.igst_amount || 0),
    customerName: row.customer_name || '-',
    gstin: row.customer_gstin || '-',
    customer: { name: row.customer_name, gstin: row.customer_gstin },
  }
}

function mapPurchaseRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    purchaseNo: row.bill_no || '-',
    date: row.date,
    status: row.status,
    taxableAmount: Number(row.subtotal || 0),
    taxAmount: Number(row.tax_amount || 0),
    totalAmount: Number(row.total_amount || 0),
    paidAmount: Number(row.paid_amount || 0),
    balanceAmount: Number(row.balance_amount || 0),
    cgstAmount: Number(row.cgst_amount || 0),
    sgstAmount: Number(row.sgst_amount || 0),
    igstAmount: Number(row.igst_amount || 0),
    vendorName: row.vendor_name || '-',
    gstin: row.vendor_gstin || '-',
    vendor: { name: row.vendor_name, gstin: row.vendor_gstin },
  }
}

function formatProductHsn(hsn?: unknown, sac?: unknown): string {
  const h = hsn ? String(hsn).trim() : ''
  const s = sac ? String(sac).trim() : ''
  if (h && s) return `${h} / ${s}`
  return h || s || '-'
}

function mapProductRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '-',
    hsn: formatProductHsn(row.hsn_code, row.sac_code),
    currentStock: Math.max(0, Number(row.current_stock ?? 0)),
    lowStockAlert: Number(row.low_stock_alert ?? 10),
  }
}

export async function GET(req: NextRequest) {
  const { error, organizationId } = await requirePermission('reports', 'view')
  if (error) return error

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') || 'sales-summary'
  const partyId = searchParams.get('partyId') || searchParams.get('customerId') || searchParams.get('vendorId')
  const fromDate = searchParams.get('from') || searchParams.get('fromDate')
  const toDate = searchParams.get('to') || searchParams.get('toDate')
  const limit = parseInt(searchParams.get('limit') || '1000', 10)

  // Quick Party Options endpoint for filter dropdowns
  if (type === 'options' || type === 'party-options') {
    const [customers] = await db.execute(
      'SELECT id, name FROM customers WHERE organization_id = ? AND is_active = 1 ORDER BY name ASC',
      [organizationId]
    ) as any[]
    const [vendors] = await db.execute(
      'SELECT id, name FROM vendors WHERE organization_id = ? AND is_active = 1 ORDER BY name ASC',
      [organizationId]
    ) as any[]
    return NextResponse.json({ customers, vendors })
  }

  const salesTypes = ['sales-summary', 'gst-sales', 'sales']
  const purchaseTypes = ['purchase-summary', 'gst-purchase', 'purchases']
  const stockTypes = ['stock-report', 'stock']
  const lowStockTypes = ['low-stock']

  if (salesTypes.includes(type)) {
    const conditions: string[] = []
    const params: any[] = []
    appendOrgFilter(conditions, params, organizationId!, 'i')
    if (partyId && partyId !== 'ALL') {
      conditions.push('i.customer_id = ?')
      params.push(partyId)
    }
    if (fromDate) {
      conditions.push('DATE(i.date) >= ?')
      params.push(fromDate)
    }
    if (toDate) {
      conditions.push('DATE(i.date) <= ?')
      params.push(toDate)
    }
    const where = 'WHERE ' + conditions.join(' AND ')

    const [rows] = await db.execute(
      `SELECT i.id, i.invoice_no, i.date, i.status, i.subtotal, i.tax_amount, i.total_amount, i.paid_amount, i.balance_amount,
              i.cgst_amount, i.sgst_amount, i.igst_amount, c.name AS customer_name, c.gstin AS customer_gstin
       FROM invoices i
       LEFT JOIN customers c ON i.customer_id = c.id
       ${where}
       ORDER BY i.date ASC, i.invoice_no ASC
       ${sqlLimitClause(limit)}`,
      params
    ) as [Record<string, unknown>[], unknown]

    const [summaryRows] = await db.execute(
      `SELECT COALESCE(SUM(i.subtotal), 0) AS total_taxable,
              COALESCE(SUM(i.cgst_amount), 0) AS total_cgst,
              COALESCE(SUM(i.sgst_amount), 0) AS total_sgst,
              COALESCE(SUM(i.igst_amount), 0) AS total_igst,
              COALESCE(SUM(i.tax_amount), 0) AS total_tax,
              COALESCE(SUM(i.total_amount), 0) AS total_sales,
              COALESCE(SUM(i.paid_amount), 0) AS total_received,
              COALESCE(SUM(i.balance_amount), 0) AS total_outstanding,
              COUNT(*) AS total_count
       FROM invoices i
       ${where}`,
      params
    ) as [Record<string, unknown>[], unknown]

    return NextResponse.json({ data: rows.map(mapInvoiceRow), summary: summaryRows[0] || null })
  }

  if (purchaseTypes.includes(type)) {
    const conditions: string[] = []
    const params: any[] = []
    appendOrgFilter(conditions, params, organizationId!, 'p')
    if (partyId && partyId !== 'ALL') {
      conditions.push('p.vendor_id = ?')
      params.push(partyId)
    }
    if (fromDate) {
      conditions.push('DATE(p.date) >= ?')
      params.push(fromDate)
    }
    if (toDate) {
      conditions.push('DATE(p.date) <= ?')
      params.push(toDate)
    }
    const where = 'WHERE ' + conditions.join(' AND ')

    const [rows] = await db.execute(
      `SELECT p.id, p.bill_no, p.date, p.status, p.subtotal, p.tax_amount, p.total_amount, p.paid_amount, p.balance_amount,
              p.cgst_amount, p.sgst_amount, p.igst_amount, v.name AS vendor_name, v.gstin AS vendor_gstin
       FROM purchases p
       LEFT JOIN vendors v ON p.vendor_id = v.id
       ${where}
       ORDER BY p.date DESC, p.id DESC
       ${sqlLimitClause(limit)}`,
      params
    ) as [Record<string, unknown>[], unknown]

    const [summaryRows] = await db.execute(
      `SELECT COALESCE(SUM(p.subtotal), 0) AS total_taxable,
              COALESCE(SUM(p.cgst_amount), 0) AS total_cgst,
              COALESCE(SUM(p.sgst_amount), 0) AS total_sgst,
              COALESCE(SUM(p.igst_amount), 0) AS total_igst,
              COALESCE(SUM(p.tax_amount), 0) AS total_tax,
              COALESCE(SUM(p.total_amount), 0) AS total_purchases,
              COALESCE(SUM(p.paid_amount), 0) AS total_paid,
              COALESCE(SUM(p.balance_amount), 0) AS total_outstanding,
              COUNT(*) AS total_count
       FROM purchases p
       ${where}`,
      params
    ) as [Record<string, unknown>[], unknown]

    return NextResponse.json({ data: rows.map(mapPurchaseRow), summary: summaryRows[0] || null })
  }

  if (stockTypes.includes(type) || lowStockTypes.includes(type)) {
    const conditions: string[] = ['p.is_active = 1']
    const params: any[] = []
    appendOrgFilter(conditions, params, organizationId!, 'p')
    if (lowStockTypes.includes(type)) {
      conditions.push('p.current_stock <= COALESCE(p.low_stock_alert, 10)')
    }
    const where = 'WHERE ' + conditions.join(' AND ')

    const [rows] = await db.execute(
      `SELECT p.id, p.name, p.description, p.hsn_code, p.sac_code, p.current_stock, p.low_stock_alert
       FROM products p
       ${where}
       ORDER BY p.name ASC
       ${sqlLimitClause(limit)}`,
      params
    ) as [Record<string, unknown>[], unknown]

    return NextResponse.json({ data: rows.map(mapProductRow) })
  }

  if (type === 'customer-ledger') {
    const invCond: string[] = []
    const invParams: any[] = []
    appendOrgFilter(invCond, invParams, organizationId!, 'i')
    if (partyId && partyId !== 'ALL') {
      invCond.push('i.customer_id = ?')
      invParams.push(partyId)
    }
    if (fromDate) {
      invCond.push('DATE(i.date) >= ?')
      invParams.push(fromDate)
    }
    if (toDate) {
      invCond.push('DATE(i.date) <= ?')
      invParams.push(toDate)
    }
    const invWhere = 'WHERE ' + invCond.join(' AND ')

    const [invoices] = await db.execute(
      `SELECT i.id, i.date, i.invoice_no AS refNo, 'Invoice' AS voucherType,
              '-' AS modeOrRef,
              i.total_amount AS debit, 0 AS credit, c.name AS partyName
       FROM invoices i
       LEFT JOIN customers c ON i.customer_id = c.id
       ${invWhere}`,
      invParams
    ) as [Record<string, unknown>[], unknown]

    const payCond: string[] = ["p.type = 'INWARD'"]
    const payParams: any[] = []
    appendOrgFilter(payCond, payParams, organizationId!, 'p')
    if (partyId && partyId !== 'ALL') {
      payCond.push('p.customer_id = ?')
      payParams.push(partyId)
    }
    if (fromDate) {
      payCond.push('DATE(p.payment_date) >= ?')
      payParams.push(fromDate)
    }
    if (toDate) {
      payCond.push('DATE(p.payment_date) <= ?')
      payParams.push(toDate)
    }
    const payWhere = 'WHERE ' + payCond.join(' AND ')

    const [payments] = await db.execute(
      `SELECT p.id, p.payment_date AS date,
              COALESCE(p.payment_no, p.reference_no, CONCAT('PAY-', LEFT(p.id, 8))) AS refNo,
              'Payment' AS voucherType,
              p.payment_mode, p.reference_no,
              0 AS debit, p.amount AS credit, c.name AS partyName
       FROM payments p
       LEFT JOIN customers c ON p.customer_id = c.id
       ${payWhere}`,
      payParams
    ) as [Record<string, unknown>[], unknown]

    const combined = [...invoices, ...payments].sort((a: any, b: any) => {
      const dA = new Date(a.date).getTime()
      const dB = new Date(b.date).getTime()
      return dA - dB
    })

    let runningBalance = 0
    let totalDebit = 0
    let totalCredit = 0

    const formattedData = combined.map((row: any) => {
      const debit = Number(row.debit || 0)
      const credit = Number(row.credit || 0)
      runningBalance += debit - credit
      totalDebit += debit
      totalCredit += credit

      let modeOrRef = row.modeOrRef || '-'
      if (row.voucherType === 'Payment') {
        const mode = row.payment_mode || 'Cash'
        const ref = row.reference_no ? String(row.reference_no).trim() : ''
        if (ref && ref !== row.refNo) {
          modeOrRef = `${mode} (Ref: ${ref})`
        } else {
          modeOrRef = mode
        }
      }

      return {
        id: row.id,
        date: row.date,
        refNo: row.refNo,
        voucherType: row.voucherType,
        description: modeOrRef,
        partyName: row.partyName || '-',
        debit,
        credit,
        balance: runningBalance,
      }
    })

    return NextResponse.json({
      data: formattedData,
      summary: {
        total_debit: totalDebit,
        total_credit: totalCredit,
        closing_balance: runningBalance,
        total_count: formattedData.length,
      },
    })
  }

  if (type === 'vendor-ledger') {
    const purCond: string[] = []
    const purParams: any[] = []
    appendOrgFilter(purCond, purParams, organizationId!, 'p')
    if (partyId && partyId !== 'ALL') {
      purCond.push('p.vendor_id = ?')
      purParams.push(partyId)
    }
    if (fromDate) {
      purCond.push('DATE(p.date) >= ?')
      purParams.push(fromDate)
    }
    if (toDate) {
      purCond.push('DATE(p.date) <= ?')
      purParams.push(toDate)
    }
    const purWhere = 'WHERE ' + purCond.join(' AND ')

    const [purchases] = await db.execute(
      `SELECT p.id, p.date, COALESCE(p.bill_no, 'PURCHASE') AS refNo, 'Purchase' AS voucherType,
              '-' AS modeOrRef,
              0 AS debit, p.total_amount AS credit, v.name AS partyName
       FROM purchases p
       LEFT JOIN vendors v ON p.vendor_id = v.id
       ${purWhere}`,
      purParams
    ) as [Record<string, unknown>[], unknown]

    const payCond: string[] = ["pm.type = 'OUTWARD'"]
    const payParams: any[] = []
    appendOrgFilter(payCond, payParams, organizationId!, 'pm')
    if (partyId && partyId !== 'ALL') {
      payCond.push('pm.vendor_id = ?')
      payParams.push(partyId)
    }
    if (fromDate) {
      payCond.push('DATE(pm.payment_date) >= ?')
      payParams.push(fromDate)
    }
    if (toDate) {
      payCond.push('DATE(pm.payment_date) <= ?')
      payParams.push(toDate)
    }
    const payWhere = 'WHERE ' + payCond.join(' AND ')

    const [payments] = await db.execute(
      `SELECT pm.id, pm.payment_date AS date,
              COALESCE(pm.payment_no, pm.reference_no, CONCAT('PAY-', LEFT(pm.id, 8))) AS refNo,
              'Payment' AS voucherType,
              pm.payment_mode, pm.reference_no,
              pm.amount AS debit, 0 AS credit, v.name AS partyName
       FROM payments pm
       LEFT JOIN vendors v ON pm.vendor_id = v.id
       ${payWhere}`,
      payParams
    ) as [Record<string, unknown>[], unknown]

    const combined = [...purchases, ...payments].sort((a: any, b: any) => {
      const dA = new Date(a.date).getTime()
      const dB = new Date(b.date).getTime()
      return dA - dB
    })

    let runningBalance = 0
    let totalDebit = 0
    let totalCredit = 0

    const formattedData = combined.map((row: any) => {
      const debit = Number(row.debit || 0)
      const credit = Number(row.credit || 0)
      runningBalance += credit - debit
      totalDebit += debit
      totalCredit += credit

      let modeOrRef = row.modeOrRef || '-'
      if (row.voucherType === 'Payment') {
        const mode = row.payment_mode || 'Cash'
        const ref = row.reference_no ? String(row.reference_no).trim() : ''
        if (ref && ref !== row.refNo) {
          modeOrRef = `${mode} (Ref: ${ref})`
        } else {
          modeOrRef = mode
        }
      }

      return {
        id: row.id,
        date: row.date,
        refNo: row.refNo,
        voucherType: row.voucherType,
        description: modeOrRef,
        partyName: row.partyName || '-',
        debit,
        credit,
        balance: runningBalance,
      }
    })

    return NextResponse.json({
      data: formattedData,
      summary: {
        total_debit: totalDebit,
        total_credit: totalCredit,
        closing_balance: runningBalance,
        total_count: formattedData.length,
      },
    })
  }

  return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
}
