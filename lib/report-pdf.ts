import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatDate } from '@/lib/utils'

export interface ReportPdfSettings {
  companyName?: string | null
  gstin?: string | null
  pan?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  pincode?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  logo?: string | null
}

export interface ReportPdfOptions {
  reportType: string
  reportTitle: string
  from: string
  to: string
  partyName?: string
  companyName?: string
  settings?: ReportPdfSettings | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  summary?: Record<string, any> | null
}

function formatAmount(val: unknown, maxDigits: number = 2): string {
  const num = Number(val || 0)
  if (isNaN(num)) return '0.00'
  return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: maxDigits })
}

export function generateReportPdf(options: ReportPdfOptions) {
  const {
    reportType,
    reportTitle,
    from,
    to,
    partyName = 'All Parties',
    data,
    summary,
  } = options

  // Create A4 Landscape Document
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth() // 297mm
  const pageH = doc.internal.pageSize.getHeight() // 210mm
  const margin = 12
  const contentW = pageW - margin * 2 // 273mm

  // Colors
  const primaryBlue: [number, number, number] = [37, 99, 235] // Vibrant Blue
  const subBlue: [number, number, number] = [96, 165, 250] // Light Blue

  const org = options.settings || {}
  const companyName = org.companyName || options.companyName || 'VIros Entrepreneurs IT Solutions Private Limited'

  // 1. Organization Header (Top-Left: Logo + Company Name + Address, Top-Right: GSTIN, PAN, Phone, Email, Website)
  const headerTop = margin

  // Logo (if available)
  const hasLogo = Boolean(org.logo && typeof org.logo === 'string' && org.logo.startsWith('data:image'))
  const logoSize = 18
  if (hasLogo) {
    try {
      const fmt = org.logo!.includes('image/png') ? 'PNG' : 'JPEG'
      doc.addImage(org.logo!, fmt, margin, headerTop, logoSize, logoSize)
    } catch {
      // skip invalid logo image
    }
  }

  const leftTextX = hasLogo ? margin + logoSize + 4 : margin
  let leftY = headerTop + 3.5

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(15, 23, 42) // Dark Slate
  doc.text(companyName, leftTextX, leftY)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(71, 85, 105) // Slate 600

  const maxAddrWidth = contentW * 0.52
  if (org.address) {
    const addrLines = String(org.address).split('\n').map((l) => l.trim()).filter(Boolean)
    for (const line of addrLines) {
      const wrapped = doc.splitTextToSize(line, maxAddrWidth)
      leftY += 3.8
      doc.text(wrapped, leftTextX, leftY)
      leftY += (wrapped.length - 1) * 3.2
    }
  }

  const locParts = [org.city, org.state].filter(Boolean).map((s) => String(s).trim())
  let locLine = locParts.join(', ')
  if (org.pincode) {
    locLine = locLine ? `${locLine} - ${String(org.pincode).trim()}` : String(org.pincode).trim()
  }
  if (locLine) {
    leftY += 3.8
    doc.text(locLine, leftTextX, leftY)
  }

  // Right-aligned contacts: GSTIN, PAN, Phone, Email, Website
  const rightX = pageW - margin
  let rightY = headerTop + 3.5

  const rawContacts = [
    ['GSTIN', org.gstin],
    ['PAN', org.pan],
    ['Phone', org.phone],
    ['Email', org.email],
    ['Website', org.website],
  ] as const

  const contacts = rawContacts.filter(([_, val]) => Boolean(val && String(val).trim()))

  doc.setFontSize(7.5)
  contacts.forEach(([label, val]) => {
    const labelText = `${label} : `
    const valueText = String(val).trim()
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(71, 85, 105)
    const labelW = doc.getTextWidth(labelText)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(15, 23, 42)
    const valueW = doc.getTextWidth(valueText)
    const totalW = labelW + valueW

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(71, 85, 105)
    doc.text(labelText, rightX - totalW, rightY)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(15, 23, 42)
    doc.text(valueText, rightX - valueW, rightY)
    rightY += 3.8
  })

  // Horizontal divider line
  const orgHeaderBottom = Math.max(leftY, rightY, hasLogo ? headerTop + logoSize : headerTop) + 3
  doc.setDrawColor(203, 213, 225) // Slate 300
  doc.setLineWidth(0.35)
  doc.line(margin, orgHeaderBottom, margin + contentW, orgHeaderBottom)

  // 2. Centered Header Title & Subtitle
  const titleY = orgHeaderBottom + 6
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...primaryBlue)
  doc.text(reportTitle.toUpperCase(), pageW / 2, titleY, { align: 'center' })

  const subtitleY = titleY + 4.2
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...subBlue)
  doc.text('STATEMENT OF ACCOUNTS & FINANCIAL REPORT', pageW / 2, subtitleY, { align: 'center' })

  // 3. Left Metadata Info Section
  let partyLabel = 'Party Name'
  if (
    reportType === 'customer-ledger' ||
    reportType === 'sales-summary' ||
    reportType === 'gst-sales' ||
    reportType === 'pending-customer-invoices' ||
    reportType === 'sales-product'
  ) {
    partyLabel = 'Customer Name'
  } else if (
    reportType === 'vendor-ledger' ||
    reportType === 'purchase-summary' ||
    reportType === 'gst-purchase' ||
    reportType === 'pending-vendor-invoices' ||
    reportType === 'purchase-product'
  ) {
    partyLabel = 'Vendor Name'
  }

  let displayParty = !partyName || partyName === 'All Parties' || partyName === 'ALL' ? 'ALL' : partyName
  if ((displayParty === 'ALL' || displayParty === 'Selected Customer' || displayParty === 'Selected Vendor') && data.length > 0) {
    const firstParty = data[0]?.partyName || data[0]?.customerName || data[0]?.vendorName
    if (firstParty && firstParty !== '-' && partyName && partyName !== 'ALL' && partyName !== 'All Parties') {
      displayParty = firstParty
    }
  }

  const nowStr = `${new Date().toLocaleDateString('en-IN')} ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`

  let leftMetaY = subtitleY + 5.5
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(30, 41, 59)

  doc.text(`${partyLabel}:-  ${displayParty}`, margin, leftMetaY)
  leftMetaY += 5
  doc.text(`Date Range:-  ${formatDate(from)} to ${formatDate(to)}`, margin, leftMetaY)
  leftMetaY += 5
  doc.text(`GENERATED ON:-  ${nowStr}`, margin, leftMetaY)

  // 4. Right Summary Metrics Info Section
  const rightMetricX = margin + 175
  let rightMetaY = subtitleY + 5.5

  if (summary) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(30, 41, 59)

    if (reportType === 'customer-ledger') {
      const bal = Number(summary.closing_balance || 0)
      const drCr = bal >= 0 ? 'Dr' : 'Cr'
      doc.text(`Total Debit:-  ${formatAmount(summary.total_debit)}`, rightMetricX, rightMetaY)
      rightMetaY += 5
      doc.text(`Total Credit:-  ${formatAmount(summary.total_credit)}`, rightMetricX, rightMetaY)
      rightMetaY += 5
      doc.text(`Closing Balance:-  ${formatAmount(Math.abs(bal))} ${drCr}`, rightMetricX, rightMetaY)
    } else if (reportType === 'vendor-ledger') {
      const bal = Number(summary.closing_balance || 0)
      const drCr = bal >= 0 ? 'Cr' : 'Dr'
      doc.text(`Total Credit:-  ${formatAmount(summary.total_credit)}`, rightMetricX, rightMetaY)
      rightMetaY += 5
      doc.text(`Total Debit:-  ${formatAmount(summary.total_debit)}`, rightMetricX, rightMetaY)
      rightMetaY += 5
      doc.text(`Closing Balance:-  ${formatAmount(Math.abs(bal))} ${drCr}`, rightMetricX, rightMetaY)
    } else if (reportType === 'sales-summary' || reportType === 'gst-sales') {
      doc.text(`Total Sales:-  ${formatAmount(summary.total_sales)}`, rightMetricX, rightMetaY)
      rightMetaY += 5
      doc.text(`Taxable Value:-  ${formatAmount(summary.total_taxable)}`, rightMetricX, rightMetaY)
      rightMetaY += 5
      doc.text(`Total Tax:-  ${formatAmount(summary.total_tax)}`, rightMetricX, rightMetaY)
    } else if (reportType === 'purchase-summary' || reportType === 'gst-purchase') {
      doc.text(`Total Purchases:-  ${formatAmount(summary.total_purchases)}`, rightMetricX, rightMetaY)
      rightMetaY += 5
      doc.text(`Taxable Value:-  ${formatAmount(summary.total_taxable)}`, rightMetricX, rightMetaY)
      rightMetaY += 5
      doc.text(`Total Tax:-  ${formatAmount(summary.total_tax)}`, rightMetricX, rightMetaY)
    } else if (reportType === 'sales-product') {
      doc.text(`Total Qty Sold:-  ${summary.total_quantity || 0}`, rightMetricX, rightMetaY)
      rightMetaY += 5
      doc.text(`Taxable Value:-  ${formatAmount(summary.total_taxable)}`, rightMetricX, rightMetaY)
      rightMetaY += 5
      doc.text(`Total Product Sales:-  ${formatAmount(summary.total_sales)}`, rightMetricX, rightMetaY)
    } else if (reportType === 'purchase-product') {
      doc.text(`Total Qty Purchased:-  ${summary.total_quantity || 0}`, rightMetricX, rightMetaY)
      rightMetaY += 5
      doc.text(`Taxable Value:-  ${formatAmount(summary.total_taxable)}`, rightMetricX, rightMetaY)
      rightMetaY += 5
      doc.text(`Total Product Purchases:-  ${formatAmount(summary.total_purchases)}`, rightMetricX, rightMetaY)
    } else if (reportType === 'pending-customer-invoices') {
      doc.text(`Pending Invoices:-  ${summary.total_count || 0}`, rightMetricX, rightMetaY)
      rightMetaY += 5
      doc.text(`Total Amount:-  ${formatAmount(summary.total_sales)}`, rightMetricX, rightMetaY)
      rightMetaY += 5
      doc.text(`Pending Balance:-  ${formatAmount(summary.total_outstanding)}`, rightMetricX, rightMetaY)
    } else if (reportType === 'pending-vendor-invoices') {
      doc.text(`Pending Bills:-  ${summary.total_count || 0}`, rightMetricX, rightMetaY)
      rightMetaY += 5
      doc.text(`Total Amount:-  ${formatAmount(summary.total_purchases)}`, rightMetricX, rightMetaY)
      rightMetaY += 5
      doc.text(`Pending Balance:-  ${formatAmount(summary.total_outstanding)}`, rightMetricX, rightMetaY)
    }
  }

  const startY = Math.max(leftMetaY, rightMetaY) + 5

  // 4. Define Table Columns & Rows based on reportType
  let head: string[][] = []
  let body: (string | number)[][] = []
  let foot: string[][] | undefined = undefined

  if (reportType === 'sales-summary') {
    head = [['Date', 'Invoice No', 'Customer Name', 'Taxable Amt (Rs.)', 'Tax Amt (Rs.)', 'Total Amount (Rs.)']]
    body = data.map((r) => [
      formatDate(r.date),
      r.invoiceNo || '-',
      r.customerName || r.customer?.name || '-',
      formatAmount(r.taxableAmount),
      formatAmount(r.taxAmount),
      formatAmount(r.totalAmount),
    ])
    if (summary) {
      foot = [['Total', '', `${data.length} Invoice(s)`, formatAmount(summary.total_taxable), formatAmount(summary.total_tax), formatAmount(summary.total_sales)]]
    }
  } else if (reportType === 'gst-sales') {
    head = [['Date', 'Invoice No', 'Customer Name', 'GSTIN', 'Taxable (Rs.)', 'CGST (Rs.)', 'SGST (Rs.)', 'IGST (Rs.)', 'Total Tax (Rs.)', 'Invoice Total (Rs.)']]
    body = data.map((r) => [
      formatDate(r.date),
      r.invoiceNo || '-',
      r.customerName || r.customer?.name || '-',
      r.gstin || r.customer?.gstin || '-',
      formatAmount(r.taxableAmount),
      formatAmount(r.cgstAmount),
      formatAmount(r.sgstAmount),
      formatAmount(r.igstAmount),
      formatAmount(r.taxAmount),
      formatAmount(r.totalAmount),
    ])
    if (summary) {
      foot = [['Total', '', `${data.length} Record(s)`, '', formatAmount(summary.total_taxable), formatAmount(summary.total_cgst), formatAmount(summary.total_sgst), formatAmount(summary.total_igst), formatAmount(summary.total_tax), formatAmount(summary.total_sales)]]
    }
  } else if (reportType === 'purchase-summary') {
    head = [['Date', 'Bill Date', 'Bill No', 'Vendor Name', 'Taxable Amt (Rs.)', 'Tax Amt (Rs.)', 'Total Amount (Rs.)', 'Paid (Rs.)', 'Balance (Rs.)']]
    body = data.map((r) => [
      formatDate(r.date),
      formatDate(r.billDate),
      r.purchaseNo || '-',
      r.vendorName || r.vendor?.name || '-',
      formatAmount(r.taxableAmount),
      formatAmount(r.taxAmount),
      formatAmount(r.totalAmount),
      formatAmount(r.paidAmount),
      formatAmount(r.balanceAmount),
    ])
    if (summary) {
      foot = [['Total', '', '', `${data.length} Bill(s)`, formatAmount(summary.total_taxable), formatAmount(summary.total_tax), formatAmount(summary.total_purchases), formatAmount(summary.total_paid), formatAmount(summary.total_outstanding)]]
    }
  } else if (reportType === 'gst-purchase') {
    head = [['Date', 'Bill Date', 'Bill No', 'Vendor Name', 'GSTIN', 'Taxable (Rs.)', 'CGST (Rs.)', 'SGST (Rs.)', 'IGST (Rs.)', 'Total Tax (Rs.)', 'Bill Total (Rs.)']]
    body = data.map((r) => [
      formatDate(r.date),
      formatDate(r.billDate),
      r.purchaseNo || '-',
      r.vendorName || r.vendor?.name || '-',
      r.gstin || r.vendor?.gstin || '-',
      formatAmount(r.taxableAmount),
      formatAmount(r.cgstAmount),
      formatAmount(r.sgstAmount),
      formatAmount(r.igstAmount),
      formatAmount(r.taxAmount),
      formatAmount(r.totalAmount),
    ])
    if (summary) {
      foot = [['Total', '', '', `${data.length} Record(s)`, '', formatAmount(summary.total_taxable), formatAmount(summary.total_cgst), formatAmount(summary.total_sgst), formatAmount(summary.total_igst), formatAmount(summary.total_tax), formatAmount(summary.total_purchases)]]
    }
  } else if (reportType === 'pending-customer-invoices') {
    head = [['Date', 'Due Date', 'Invoice No', 'Customer Name', 'Total Amount (Rs.)', 'Paid Amount (Rs.)', 'Pending Balance (Rs.)', 'Status']]
    body = data.map((r) => {
      const due = r.dueDate ? formatDate(r.dueDate) : formatDate(r.date)
      const diffTime = new Date().getTime() - new Date(r.dueDate || r.date).getTime()
      const daysOverdue = Math.max(0, Math.floor(diffTime / 86400000))
      const statusText = daysOverdue > 0 ? `${daysOverdue} Days Overdue` : 'Due'
      return [
        formatDate(r.date),
        due,
        r.invoiceNo || '-',
        r.customerName || r.customer?.name || '-',
        formatAmount(r.totalAmount),
        formatAmount(r.paidAmount),
        formatAmount(r.balanceAmount),
        statusText,
      ]
    })
    if (summary) {
      foot = [['Total Pending', '', `${data.length} Invoice(s)`, '', formatAmount(summary.total_sales), formatAmount(summary.total_received), formatAmount(summary.total_outstanding), '']]
    }
  } else if (reportType === 'pending-vendor-invoices') {
    head = [['Date', 'Due Date', 'Bill No', 'Vendor Name', 'Total Amount (Rs.)', 'Paid Amount (Rs.)', 'Pending Balance (Rs.)', 'Status']]
    body = data.map((r) => {
      const due = r.dueDate ? formatDate(r.dueDate) : formatDate(r.date)
      const diffTime = new Date().getTime() - new Date(r.dueDate || r.date).getTime()
      const daysOverdue = Math.max(0, Math.floor(diffTime / 86400000))
      const statusText = daysOverdue > 0 ? `${daysOverdue} Days Overdue` : 'Due'
      return [
        formatDate(r.date),
        due,
        r.purchaseNo || '-',
        r.vendorName || r.vendor?.name || '-',
        formatAmount(r.totalAmount),
        formatAmount(r.paidAmount),
        formatAmount(r.balanceAmount),
        statusText,
      ]
    })
    if (summary) {
      foot = [['Total Pending', '', `${data.length} Bill(s)`, '', formatAmount(summary.total_purchases), formatAmount(summary.total_paid), formatAmount(summary.total_outstanding), '']]
    }
  } else if (reportType === 'customer-ledger') {
    head = [['Date', 'Party Name', 'Voucher', 'Invoice No. / Payment ID', 'Mode of payment / Ref No', 'Debit (Rs.)', 'Credit (Rs.)', 'Balance (Rs.)']]
    body = data.map((r) => [
      formatDate(r.date),
      r.partyName || '-',
      r.voucherType || '-',
      r.refNo || '-',
      r.description || '-',
      r.debit > 0 ? formatAmount(r.debit) : '-',
      r.credit > 0 ? formatAmount(r.credit) : '-',
      formatAmount(r.balance),
    ])
    if (summary) {
      const bal = Number(summary.closing_balance || 0)
      const drCr = bal >= 0 ? 'Dr' : 'Cr'
      foot = [
        ['Total', '', '', '', '', formatAmount(summary.total_debit), formatAmount(summary.total_credit), '-'],
        ['Closing Bal.', '', '', '', '', '0.00', `${formatAmount(Math.abs(bal))} ${drCr}`, '-'],
      ]
    }
  } else if (reportType === 'vendor-ledger') {
    head = [['Date', 'Party Name', 'Voucher', 'Bill No. / Payment ID', 'Mode of payment / Ref No', 'Credit (Rs.)', 'Debit (Rs.)', 'Balance (Rs.)']]
    body = data.map((r) => [
      formatDate(r.date),
      r.partyName || '-',
      r.voucherType || '-',
      r.refNo || '-',
      r.description || '-',
      r.credit > 0 ? formatAmount(r.credit) : '-',
      r.debit > 0 ? formatAmount(r.debit) : '-',
      formatAmount(r.balance),
    ])
    if (summary) {
      const bal = Number(summary.closing_balance || 0)
      const drCr = bal >= 0 ? 'Cr' : 'Dr'
      foot = [
        ['Total', '', '', '', '', formatAmount(summary.total_credit), formatAmount(summary.total_debit), '-'],
        ['Closing Bal.', '', '', '', '', '0.00', `${formatAmount(Math.abs(bal))} ${drCr}`, '-'],
      ]
    }
  } else if (reportType === 'sales-product') {
    head = [['Date', 'Invoice No', 'Party Name', 'Product Name', 'HSN/SAC', 'Qty', 'Rate (Rs.)', 'Taxable (Rs.)', 'GST (Rs.)', 'Total (Rs.)']]
    body = data.map((r) => [
      formatDate(r.date),
      r.invoiceNo || '-',
      r.customerName || '-',
      r.productName || r.name || '-',
      r.hsn || '-',
      `${r.quantity ?? 0} ${r.unit || ''}`.trim(),
      formatAmount(r.rate, 3),
      formatAmount(r.taxableAmount),
      `${formatAmount(r.gstAmount)} (${r.gstRate || 0}%)`,
      formatAmount(r.totalAmount),
    ])
    if (summary) {
      foot = [['Total', '', '', `${data.length} Item(s)`, '', String(summary.total_quantity || 0), '', formatAmount(summary.total_taxable), formatAmount(summary.total_tax), formatAmount(summary.total_sales)]]
    }
  } else if (reportType === 'purchase-product') {
    head = [['Bill Date', 'Bill No', 'Party Name', 'Product Name', 'HSN/SAC', 'Qty', 'Rate (Rs.)', 'Taxable (Rs.)', 'GST (Rs.)', 'Total (Rs.)']]
    body = data.map((r) => [
      formatDate(r.billDate || r.date),
      r.purchaseNo || r.billNo || '-',
      r.vendorName || '-',
      r.productName || r.name || '-',
      r.hsn || '-',
      `${r.quantity ?? 0} ${r.unit || ''}`.trim(),
      formatAmount(r.rate, 3),
      formatAmount(r.taxableAmount),
      `${formatAmount(r.gstAmount)} (${r.gstRate || 0}%)`,
      formatAmount(r.totalAmount),
    ])
    if (summary) {
      foot = [['Total', '', '', `${data.length} Item(s)`, '', String(summary.total_quantity || 0), '', formatAmount(summary.total_taxable), formatAmount(summary.total_tax), formatAmount(summary.total_purchases)]]
    }
  } else if (reportType === 'stock-report' || reportType === 'low-stock') {
    head = [['Product Name', 'Description', 'HSN/SAC', 'Current Stock', 'Alert Level']]
    body = data.map((r) => [
      r.name || '-',
      r.description || '-',
      r.hsn || '-',
      String(r.currentStock ?? 0),
      String(r.lowStockAlert ?? 10),
    ])
  }

  // 5. Generate AutoTable in Landscape
  autoTable(doc, {
    startY,
    head,
    body,
    foot,
    margin: { left: margin, right: margin, top: 15, bottom: 15 },
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2.2,
      textColor: [15, 23, 42],
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: primaryBlue,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    didDrawPage: (dataArg) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalPages = (doc as any).internal.getNumberOfPages()
      const currentPage = dataArg.pageNumber

      // Running header on page 2+
      if (currentPage > 1) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7.5)
        doc.setTextColor(100, 116, 139)
        doc.text(`${companyName} — ${reportTitle}`, margin, 10)
        doc.setDrawColor(226, 232, 240)
        doc.setLineWidth(0.2)
        doc.line(margin, 12, margin + contentW, 12)
      }

      // Bottom footer line
      doc.setDrawColor(226, 232, 240)
      doc.setLineWidth(0.3)
      doc.line(margin, pageH - 9, margin + contentW, pageH - 9)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(100, 116, 139)

      // Footer Branding Text with Organization Name
      doc.text(
        `© All Rights Reserved ${companyName}`,
        margin,
        pageH - 4.5,
        { align: 'left' }
      )

      // Page Numbering
      doc.text(
        `Page ${currentPage} of ${totalPages}`,
        pageW - margin,
        pageH - 4.5,
        { align: 'right' }
      )
    },
  })

  // 6. Save PDF
  const sanitizeFilename = (str: string) =>
    str
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_')

  const todayStr = new Date().toISOString().split('T')[0]
  let pdfFilename = ''

  if (partyName && partyName !== 'All Parties' && partyName !== 'ALL') {
    pdfFilename = `${sanitizeFilename(partyName)}_Ledger_${todayStr}.pdf`
  } else {
    pdfFilename = `${sanitizeFilename(reportTitle)}_ALL_${todayStr}.pdf`
  }

  doc.save(pdfFilename)
}
