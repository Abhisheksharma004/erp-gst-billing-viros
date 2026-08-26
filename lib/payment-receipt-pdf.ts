import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { drawDocumentHeader, type DocumentHeaderSettings } from '@/lib/document-header-pdf'
import { amountInWords } from '@/lib/amount-in-words'

export interface PaymentPdfData {
  id?: string
  payment_no: string
  type: 'INWARD' | 'OUTWARD'
  payment_date: string | Date
  amount: number | string
  payment_mode?: string | null
  reference_no?: string | null
  bank_name?: string | null
  notes?: string | null
  customer_name?: string | null
  vendor_name?: string | null
  linked_invoice_no?: string | null
  linked_bill_no?: string | null
  customer_gstin?: string | null
  vendor_gstin?: string | null
  customer_phone?: string | null
  vendor_phone?: string | null
  customer_address?: string | null
  vendor_address?: string | null
}

function formatPdfDate(date: string | Date | null | undefined): string {
  if (!date) return '-'
  const d = new Date(date)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const day = String(d.getDate()).padStart(2, '0')
  return `${day}-${months[d.getMonth()]}-${d.getFullYear()}`
}

function formatAmount(val: unknown): string {
  const num = Number(val || 0)
  if (isNaN(num)) return '0.00'
  return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function generatePaymentReceiptPdf(
  payment: PaymentPdfData,
  settings?: DocumentHeaderSettings | null
): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth() // 210mm
  const pageH = doc.internal.pageSize.getHeight() // 297mm
  const margin = 10
  const contentW = pageW - margin * 2 // 190mm

  const isInward = payment.type === 'INWARD'
  const partyName = isInward
    ? payment.customer_name || 'Customer'
    : payment.vendor_name || 'Vendor'
  const linkedDocNo = isInward ? payment.linked_invoice_no : payment.linked_bill_no
  const partyGstin = isInward ? payment.customer_gstin : payment.vendor_gstin
  const partyPhone = isInward ? payment.customer_phone : payment.vendor_phone
  const partyAddress = isInward ? payment.customer_address : payment.vendor_address

  const amountNum = Number(payment.amount || 0)
  const amountStr = formatAmount(amountNum)
  const wordsStr = amountInWords(amountNum)

  // Primary Theme Colors
  // Emerald for Inward (Receipts), Deep Blue/Slate for Outward (Disbursements)
  const primaryColor: [number, number, number] = isInward ? [0, 150, 110] : [37, 99, 235]
  const darkTextColor: [number, number, number] = [30, 41, 59]
  const mutedTextColor: [number, number, number] = [100, 116, 139]

  // 1. Draw Company Header
  let startY = 12
  if (settings?.companyName) {
    startY = drawDocumentHeader(doc, settings, margin, pageW)
  }

  // Tenant / Company GSTIN & PAN line right above the Voucher Title Banner
  if (settings?.gstin) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(...darkTextColor)
    doc.text(`GSTIN: ${settings.gstin}`, margin, startY + 3.5)

    if (settings.pan) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(...mutedTextColor)
      doc.text(`PAN: ${settings.pan}`, pageW - margin, startY + 3.5, { align: 'right' })
    }
    startY += 6
  }

  // 2. Voucher Title Banner
  const titleText = isInward ? 'PAYMENT RECEIPT VOUCHER' : 'PAYMENT VOUCHER'

  doc.setFillColor(...primaryColor)
  doc.roundedRect(margin, startY, contentW, 10, 1.5, 1.5, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(255, 255, 255)
  doc.text(titleText, pageW / 2, startY + 6.5, { align: 'center' })

  startY += 13

  // 3. Two-Column Info Cards (Voucher Info & Party Info)
  const boxW = (contentW - 4) / 2
  const boxH = 34

  // Left Box: Voucher Metadata
  doc.setDrawColor(226, 232, 240)
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(margin, startY, boxW, boxH, 1.5, 1.5, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...primaryColor)
  doc.text('VOUCHER DETAILS', margin + 3, startY + 5)

  doc.setDrawColor(226, 232, 240)
  doc.line(margin + 3, startY + 6.5, margin + boxW - 3, startY + 6.5)

  const metaRows: [string, string][] = [
    ['Voucher No:', payment.payment_no || '-'],
    ['Payment Date:', formatPdfDate(payment.payment_date)],
    ['Payment Mode:', (payment.payment_mode || '-').replace(/_/g, ' ')],
    ['Ref / UTR No:', payment.reference_no || '-'],
    ...(payment.bank_name ? [['Bank Name:', payment.bank_name] as [string, string]] : []),
  ]

  let metaY = startY + 11
  metaRows.forEach(([lbl, val]) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...mutedTextColor)
    doc.text(lbl, margin + 3, metaY)

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...darkTextColor)
    doc.text(val, margin + 29, metaY)
    metaY += 4.5
  })

  // Right Box: Party Details
  const rightBoxX = margin + boxW + 4
  doc.setDrawColor(226, 232, 240)
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(rightBoxX, startY, boxW, boxH, 1.5, 1.5, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...primaryColor)
  doc.text(isInward ? 'RECEIVED FROM (PARTY)' : 'PAID TO (PARTY)', rightBoxX + 3, startY + 5)

  doc.setDrawColor(226, 232, 240)
  doc.line(rightBoxX + 3, startY + 6.5, rightBoxX + boxW - 3, startY + 6.5)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...darkTextColor)
  doc.text(partyName, rightBoxX + 3, startY + 11)

  const partyDetailsY = startY + 16
  let curPartyY = partyDetailsY
  if (partyGstin) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...mutedTextColor)
    doc.text('GSTIN:', rightBoxX + 3, curPartyY)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...darkTextColor)
    doc.text(partyGstin, rightBoxX + 16, curPartyY)
    curPartyY += 4.2
  }
  if (partyPhone) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...mutedTextColor)
    doc.text('Contact:', rightBoxX + 3, curPartyY)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...darkTextColor)
    doc.text(partyPhone, rightBoxX + 16, curPartyY)
    curPartyY += 4.2
  }
  if (partyAddress) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...mutedTextColor)
    const addrLines = doc.splitTextToSize(partyAddress, boxW - 6)
    doc.text(addrLines.slice(0, 2), rightBoxX + 3, curPartyY)
  }

  startY += boxH + 6

  // 4. Transaction Particulars Table
  const particularsText = linkedDocNo
    ? `${isInward ? 'Payment received against Sales Invoice' : 'Payment made against Purchase Bill'} (${linkedDocNo})`
    : `${isInward ? 'Advance Payment Received' : 'Advance Payment Made'}`

  autoTable(doc, {
    startY: startY,
    margin: { left: margin, right: margin },
    head: [['#', 'Particulars / Description', 'Linked Document', 'Payment Mode', 'Amount (INR)']],
    body: [
      [
        '1',
        particularsText,
        linkedDocNo || 'Advance / General',
        (payment.payment_mode || 'Cash').replace(/_/g, ' '),
        `Rs. ${amountStr}`,
      ],
    ],
    foot: [
      [
        { content: 'Total Received / Paid Amount:', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } },
        { content: `Rs. ${amountStr}`, styles: { halign: 'right', fontStyle: 'bold', textColor: primaryColor } },
      ],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left',
    },
    styles: {
      fontSize: 8,
      cellPadding: 3.5,
      textColor: darkTextColor,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 85 },
      2: { cellWidth: 35 },
      3: { cellWidth: 30 },
      4: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
    },
    footStyles: {
      fillColor: [248, 250, 252],
      textColor: darkTextColor,
      fontSize: 8.5,
    },
  })

  // @ts-ignore
  let tableEndY = (doc as any).lastAutoTable?.finalY || startY + 30
  startY = tableEndY + 5

  // 5. Amount in Words Box
  doc.setFillColor(248, 250, 252)
  doc.setDrawColor(226, 232, 240)
  doc.roundedRect(margin, startY, contentW, 12, 1.5, 1.5, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...mutedTextColor)
  doc.text('AMOUNT IN WORDS:', margin + 3, startY + 4.5)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...darkTextColor)
  doc.text(wordsStr, margin + 3, startY + 9)

  startY += 16

  // 6. Notes / Remarks Section
  if (payment.notes) {
    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(226, 232, 240)
    doc.roundedRect(margin, startY, contentW, 12, 1.5, 1.5, 'D')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(...mutedTextColor)
    doc.text('REMARKS / NOTES:', margin + 3, startY + 4)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...darkTextColor)
    doc.text(payment.notes, margin + 3, startY + 8.5)

    startY += 16
  }

  // 7. Signatures Section at Bottom
  const signBoxY = Math.max(startY + 6, pageH - 45)

  // Receiver Signature
  doc.setDrawColor(203, 213, 225)
  doc.line(margin + 5, signBoxY + 18, margin + 60, signBoxY + 18)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...mutedTextColor)
  doc.text(isInward ? "Depositor's / Payer's Signature" : "Receiver's Signature", margin + 12, signBoxY + 22)

  // Authorized Signatory
  const rightSignX = pageW - margin - 65
  doc.line(rightSignX, signBoxY + 18, pageW - margin - 5, signBoxY + 18)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...darkTextColor)
  doc.text(`For ${settings?.companyName || 'Company'}`, rightSignX + 5, signBoxY + 5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...mutedTextColor)
  doc.text('Authorized Signatory', rightSignX + 15, signBoxY + 22)

  // Footer Computer Generated Note
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(6.5)
  doc.setTextColor(160, 160, 160)
  doc.text('This is a computer generated payment receipt voucher and requires no physical signature.', pageW / 2, pageH - 8, {
    align: 'center',
  })

  return doc
}

export async function downloadPaymentReceiptPdf(
  payment: PaymentPdfData,
  settings?: DocumentHeaderSettings | null
) {
  // If settings not supplied, attempt to fetch from /api/settings
  let docSettings = settings
  if (!docSettings) {
    try {
      const res = await fetch('/api/settings')
      if (res.ok) {
        docSettings = await res.json()
      }
    } catch {
      // fallback without settings
    }
  }

  const doc = generatePaymentReceiptPdf(payment, docSettings)
  const safeFilename = `${payment.payment_no || 'Payment-Receipt'}.pdf`.replace(/[/\\?%*:|"<>]/g, '-')
  doc.save(safeFilename)
}
