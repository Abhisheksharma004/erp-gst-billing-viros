import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatDate } from '@/lib/utils'

export interface ReportPdfOptions {
  reportType: string
  reportTitle: string
  from: string
  to: string
  partyName?: string
  companyName?: string
  data: any[]
  summary?: Record<string, any> | null
}

function formatAmount(val: unknown): string {
  const num = Number(val || 0)
  if (isNaN(num)) return '0.00'
  return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function generateReportPdf(options: ReportPdfOptions) {
  const {
    reportType,
    reportTitle,
    from,
    to,
    partyName = 'All Parties',
    companyName = 'ERP GST Billing',
    data,
    summary,
  } = options

  // Create A4 Landscape Document
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth() // 297mm
  const pageH = doc.internal.pageSize.getHeight() // 210mm
  const margin = 12
  const contentW = pageW - margin * 2 // 273mm

  // Theme Colors
  const headerBg: [number, number, number] = [15, 23, 42] // Slate 900
  const accentColor: [number, number, number] = [37, 99, 235] // Blue 600
  const badgeBg: [number, number, number] = [29, 78, 216] // Dark Blue 700

  // 1. Sleek Header Bar
  doc.setFillColor(...headerBg)
  doc.rect(margin, margin, contentW, 16, 'F')

  // Left: Company Name & Subtitle
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(255, 255, 255)
  doc.text(companyName.toUpperCase(), margin + 5, margin + 7)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(148, 163, 184) // Slate 400
  doc.text('STATEMENT OF ACCOUNTS & FINANCIAL REPORTS', margin + 5, margin + 12)

  // Right: Attractive Report Title Badge
  const titleText = reportTitle.toUpperCase()
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  const titleWidth = doc.getTextWidth(titleText) + 12
  const badgeX = margin + contentW - titleWidth - 5
  const badgeY = margin + 3.5

  doc.setFillColor(...badgeBg)
  doc.roundedRect(badgeX, badgeY, titleWidth, 9, 2, 2, 'F')

  doc.setTextColor(255, 255, 255)
  doc.text(titleText, badgeX + 6, badgeY + 6)

  // 2. Metadata Info Cards (3 Columns)
  let currentY = margin + 20

  // Card 1: Date Range
  const colW = (contentW - 8) / 3
  doc.setFillColor(248, 250, 252) // Slate 50
  doc.setDrawColor(226, 232, 240) // Slate 200
  doc.roundedRect(margin, currentY, colW, 11, 1.5, 1.5, 'FD')

  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(100, 116, 139)
  doc.text('DATE RANGE', margin + 4, currentY + 4.5)

  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.text(`${formatDate(from)} to ${formatDate(to)}`, margin + 4, currentY + 8.5)

  // Card 2: Party Name
  const card2X = margin + colW + 4
  doc.roundedRect(card2X, currentY, colW, 11, 1.5, 1.5, 'FD')

  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(100, 116, 139)
  doc.text('PARTY DETAILS', card2X + 4, currentY + 4.5)

  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  const partyTruncated = partyName.length > 38 ? partyName.substring(0, 36) + '...' : partyName
  doc.text(partyTruncated, card2X + 4, currentY + 8.5)

  // Card 3: Generation Date
  const card3X = margin + (colW + 4) * 2
  doc.roundedRect(card3X, currentY, colW, 11, 1.5, 1.5, 'FD')

  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(100, 116, 139)
  doc.text('GENERATED ON', card3X + 4, currentY + 4.5)

  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(15, 23, 42)
  const nowStr = `${new Date().toLocaleDateString('en-IN')} ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
  doc.text(nowStr, card3X + 4, currentY + 8.5)

  currentY += 15

  // 3. KPI Summary Bar (Clean ASCII text - no garbled symbols)
  if (summary) {
    doc.setFillColor(241, 245, 249)
    doc.setDrawColor(203, 213, 225)
    doc.roundedRect(margin, currentY, contentW, 9, 1.5, 1.5, 'FD')

    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 41, 59)

    let summaryText = ''
    if (reportType === 'sales-summary' || reportType === 'gst-sales') {
      summaryText = `Total Sales: Rs. ${formatAmount(summary.total_sales)}   |   Taxable: Rs. ${formatAmount(summary.total_taxable)}   |   Total Tax: Rs. ${formatAmount(summary.total_tax)}   |   Received: Rs. ${formatAmount(summary.total_received)}   |   Outstanding: Rs. ${formatAmount(summary.total_outstanding)}`
    } else if (reportType === 'purchase-summary' || reportType === 'gst-purchase') {
      summaryText = `Total Purchases: Rs. ${formatAmount(summary.total_purchases)}   |   Taxable: Rs. ${formatAmount(summary.total_taxable)}   |   Total Tax: Rs. ${formatAmount(summary.total_tax)}   |   Paid: Rs. ${formatAmount(summary.total_paid)}   |   Outstanding: Rs. ${formatAmount(summary.total_outstanding)}`
    } else if (reportType === 'customer-ledger' || reportType === 'vendor-ledger') {
      const bal = Number(summary.closing_balance || 0)
      const drCr = reportType === 'customer-ledger' ? (bal >= 0 ? 'Dr' : 'Cr') : (bal >= 0 ? 'Cr' : 'Dr')
      summaryText = `Total Debit: Rs. ${formatAmount(summary.total_debit)}   |   Total Credit: Rs. ${formatAmount(summary.total_credit)}   |   Closing Balance: Rs. ${formatAmount(Math.abs(bal))} ${drCr}`
    }

    if (summaryText) {
      doc.text(summaryText, margin + 4, currentY + 5.8)
    }
    currentY += 12
  } else {
    currentY += 2
  }

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
    head = [['Date', 'Bill No', 'Vendor Name', 'Taxable Amt (Rs.)', 'Tax Amt (Rs.)', 'Total Amount (Rs.)', 'Paid (Rs.)', 'Balance (Rs.)']]
    body = data.map((r) => [
      formatDate(r.date),
      r.purchaseNo || '-',
      r.vendorName || r.vendor?.name || '-',
      formatAmount(r.taxableAmount),
      formatAmount(r.taxAmount),
      formatAmount(r.totalAmount),
      formatAmount(r.paidAmount),
      formatAmount(r.balanceAmount),
    ])
    if (summary) {
      foot = [['Total', '', `${data.length} Bill(s)`, formatAmount(summary.total_taxable), formatAmount(summary.total_tax), formatAmount(summary.total_purchases), formatAmount(summary.total_paid), formatAmount(summary.total_outstanding)]]
    }
  } else if (reportType === 'gst-purchase') {
    head = [['Date', 'Bill No', 'Vendor Name', 'GSTIN', 'Taxable (Rs.)', 'CGST (Rs.)', 'SGST (Rs.)', 'IGST (Rs.)', 'Total Tax (Rs.)', 'Bill Total (Rs.)']]
    body = data.map((r) => [
      formatDate(r.date),
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
      foot = [['Total', '', `${data.length} Record(s)`, '', formatAmount(summary.total_taxable), formatAmount(summary.total_cgst), formatAmount(summary.total_sgst), formatAmount(summary.total_igst), formatAmount(summary.total_tax), formatAmount(summary.total_purchases)]]
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
    startY: currentY,
    head,
    body,
    foot,
    margin: { left: margin, right: margin, bottom: 15 },
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2.2,
      textColor: [15, 23, 42],
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: accentColor,
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
      const totalPages = (doc as any).internal.getNumberOfPages()
      const currentPage = dataArg.pageNumber

      // Bottom footer line
      doc.setDrawColor(226, 232, 240)
      doc.setLineWidth(0.3)
      doc.line(margin, pageH - 9, margin + contentW, pageH - 9)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(100, 116, 139)

      // Requested Footer Branding Text
      doc.text(
        '© All Rights Reserved VIros Entrepreneurs IT Solutions Private Limited',
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
  const sanitizeName = reportTitle.toLowerCase().replace(/[^a-z0-9]/g, '-')
  doc.save(`${sanitizeName}_${from}_to_${to}.pdf`)
}
