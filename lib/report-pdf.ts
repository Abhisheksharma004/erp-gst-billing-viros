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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    data,
    summary,
  } = options

  // Create A4 Landscape Document
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth() // 297mm
  const pageH = doc.internal.pageSize.getHeight() // 210mm
  const margin = 12
  const contentW = pageW - margin * 2 // 273mm

  // Colors matching diagram
  const primaryBlue: [number, number, number] = [37, 99, 235] // Vibrant Blue
  const subBlue: [number, number, number] = [96, 165, 250] // Light Blue

  // 1. Centered Header Title & Subtitle
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(...primaryBlue)
  doc.text(reportTitle, pageW / 2, 14, { align: 'center' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(...subBlue)
  doc.text('STATEMENT OF ACCOUNTS & FINANCIAL REPORT', pageW / 2, 19, { align: 'center' })

  // 2. Left Metadata Info Section
  let partyLabel = 'Party Name'
  if (
    reportType === 'customer-ledger' ||
    reportType === 'sales-summary' ||
    reportType === 'gst-sales' ||
    reportType === 'pending-customer-invoices'
  ) {
    partyLabel = 'Customer Name'
  } else if (
    reportType === 'vendor-ledger' ||
    reportType === 'purchase-summary' ||
    reportType === 'gst-purchase' ||
    reportType === 'pending-vendor-invoices'
  ) {
    partyLabel = 'Vendor Name'
  }

  const displayParty = !partyName || partyName === 'All Parties' || partyName === 'ALL' ? 'ALL' : partyName
  const nowStr = `${new Date().toLocaleDateString('en-IN')} ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`

  let leftY = 27
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(30, 41, 59)

  doc.text(`${partyLabel}:-  ${displayParty}`, margin, leftY)
  leftY += 6.5
  doc.text(`Date Range:-  ${formatDate(from)} to ${formatDate(to)}`, margin, leftY)
  leftY += 6.5
  doc.text(`GENERATED ON:-  ${nowStr}`, margin, leftY)

  // 3. Right Summary Metrics Info Section
  const rightX = margin + 175
  let rightY = 27

  if (summary) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(30, 41, 59)

    if (reportType === 'customer-ledger') {
      const bal = Number(summary.closing_balance || 0)
      const drCr = bal >= 0 ? 'Dr' : 'Cr'
      doc.text(`Total Debit:-  ${formatAmount(summary.total_debit)}`, rightX, rightY)
      rightY += 6.5
      doc.text(`Total Credit:-  ${formatAmount(summary.total_credit)}`, rightX, rightY)
      rightY += 6.5
      doc.text(`Closing Balance:-  ${formatAmount(Math.abs(bal))} ${drCr}`, rightX, rightY)
    } else if (reportType === 'vendor-ledger') {
      const bal = Number(summary.closing_balance || 0)
      const drCr = bal >= 0 ? 'Cr' : 'Dr'
      doc.text(`Total Credit:-  ${formatAmount(summary.total_credit)}`, rightX, rightY)
      rightY += 6.5
      doc.text(`Total Debit:-  ${formatAmount(summary.total_debit)}`, rightX, rightY)
      rightY += 6.5
      doc.text(`Closing Balance:-  ${formatAmount(Math.abs(bal))} ${drCr}`, rightX, rightY)
    } else if (reportType === 'sales-summary' || reportType === 'gst-sales') {
      doc.text(`Total Sales:-  ${formatAmount(summary.total_sales)}`, rightX, rightY)
      rightY += 6.5
      doc.text(`Taxable Value:-  ${formatAmount(summary.total_taxable)}`, rightX, rightY)
      rightY += 6.5
      doc.text(`Total Tax:-  ${formatAmount(summary.total_tax)}`, rightX, rightY)
    } else if (reportType === 'purchase-summary' || reportType === 'gst-purchase') {
      doc.text(`Total Purchases:-  ${formatAmount(summary.total_purchases)}`, rightX, rightY)
      rightY += 6.5
      doc.text(`Taxable Value:-  ${formatAmount(summary.total_taxable)}`, rightX, rightY)
      rightY += 6.5
      doc.text(`Total Tax:-  ${formatAmount(summary.total_tax)}`, rightX, rightY)
    } else if (reportType === 'pending-customer-invoices') {
      doc.text(`Pending Invoices:-  ${summary.total_count || 0}`, rightX, rightY)
      rightY += 6.5
      doc.text(`Total Amount:-  ${formatAmount(summary.total_sales)}`, rightX, rightY)
      rightY += 6.5
      doc.text(`Pending Balance:-  ${formatAmount(summary.total_outstanding)}`, rightX, rightY)
    } else if (reportType === 'pending-vendor-invoices') {
      doc.text(`Pending Bills:-  ${summary.total_count || 0}`, rightX, rightY)
      rightY += 6.5
      doc.text(`Total Amount:-  ${formatAmount(summary.total_purchases)}`, rightX, rightY)
      rightY += 6.5
      doc.text(`Pending Balance:-  ${formatAmount(summary.total_outstanding)}`, rightX, rightY)
    }
  }

  const startY = 45

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
    margin: { left: margin, right: margin, bottom: 15 },
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
