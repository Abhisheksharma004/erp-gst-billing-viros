import { computeRoundOff, roundToNearestRupee } from '@/lib/utils'
import { computeSalesDocumentItemTotals } from '@/lib/sales-document-totals'
import { randomUUID } from 'crypto'

export function computeProformaItemTotals(
  item: {
    quantity: number
    rate: number
    discount?: number
    gstRate: number
  },
  gstType: 'CGST_SGST' | 'IGST' | 'EXEMPT' = 'CGST_SGST'
) {
  return computeSalesDocumentItemTotals(item, gstType)
}

export function buildProformaTotals(
  items: any[],
  gstType: 'CGST_SGST' | 'IGST' | 'EXEMPT' = 'CGST_SGST'
) {
  let subtotal = 0
  let totalDiscount = 0
  let totalCgst = 0
  let totalSgst = 0
  let totalIgst = 0
  let grandTotal = 0

  const itemsWithTotals = items.map((item: any) => {
    const t = computeProformaItemTotals(item, gstType)
    subtotal += item.quantity * item.rate
    totalDiscount += t.discAmt
    totalCgst += t.cgst
    totalSgst += t.sgst
    totalIgst += t.igst
    grandTotal += t.total
    return { ...item, ...t }
  })

  const roundOff = computeRoundOff(grandTotal)
  grandTotal = roundToNearestRupee(grandTotal)

  return {
    itemsWithTotals,
    subtotal,
    totalDiscount,
    totalCgst,
    totalSgst,
    totalIgst,
    taxAmount: totalCgst + totalSgst + totalIgst,
    roundOff,
    grandTotal,
  }
}

export async function insertProformaItems(
  conn: Awaited<ReturnType<typeof import('@/lib/db').default.getConnection>>,
  proformaId: string,
  itemsWithTotals: any[]
) {
  for (let idx = 0; idx < itemsWithTotals.length; idx++) {
    const item = itemsWithTotals[idx]
    await conn.execute(
      `INSERT INTO proforma_items (id, proforma_id, product_id, description, quantity, rate,
        discount, gst_rate, gst_amount, amount, sort_order)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        randomUUID(),
        proformaId,
        item.productId || null,
        item.description || null,
        item.quantity,
        item.rate,
        item.discount || 0,
        item.gstRate,
        item.cgst + item.sgst + item.igst,
        item.total,
        idx + 1,
      ]
    )
  }
}
