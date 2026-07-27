import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { requirePermission } from '@/lib/api-auth'

export async function GET(req: NextRequest) {
  const { error, organizationId } = await requirePermission('dashboard', 'view')
  if (error) return error

  try {
    const { searchParams } = new URL(req.url)
    const now = new Date()
    const year = parseInt(searchParams.get('year') || String(now.getFullYear()), 10)
    const monthParam = searchParams.get('month') || ''
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    const [[salesThisMonth]] = await db.execute(
      `SELECT COALESCE(SUM(total_amount),0) as amount, COUNT(*) as count FROM invoices
       WHERE organization_id = ? AND DATE_FORMAT(date, '%Y-%m') = ?`,
      [organizationId, currentMonthKey]
    ) as any[][]

    const [[purchasesThisMonth]] = await db.execute(
      `SELECT COALESCE(SUM(total_amount),0) as amount, COUNT(*) as count FROM purchases
       WHERE organization_id = ? AND DATE_FORMAT(date, '%Y-%m') = ? AND status != 'CANCELLED'`,
      [organizationId, currentMonthKey]
    ) as any[][]

    const [[pendingQuotRow]] = await db.execute(
      `SELECT COUNT(*) as count FROM quotations WHERE organization_id = ? AND converted_to_id IS NULL`,
      [organizationId]
    ) as any[][]

    const [[lowStockRow]] = await db.execute(
      `SELECT COUNT(*) as count FROM products WHERE organization_id = ? AND current_stock <= low_stock_alert AND is_active = 1`,
      [organizationId]
    ) as any[][]

    let chartType: 'monthly' | 'daily' = 'monthly'
    let chartSales: any[] = []
    let chartPurchases: any[] = []

    if (monthParam && /^\d{1,2}$/.test(monthParam)) {
      const month = monthParam.padStart(2, '0')
      const monthKey = `${year}-${month}`

      chartType = 'daily'
      const [dailySales] = await db.execute(
        `SELECT DATE_FORMAT(date, '%Y-%m-%d') as period,
           COALESCE(SUM(total_amount),0) as total, COUNT(*) as count
         FROM invoices
         WHERE organization_id = ? AND DATE_FORMAT(date, '%Y-%m') = ?
         GROUP BY DATE_FORMAT(date, '%Y-%m-%d')
         ORDER BY period ASC`,
        [organizationId, monthKey]
      ) as any[][]
      const [dailyPurchases] = await db.execute(
        `SELECT DATE_FORMAT(date, '%Y-%m-%d') as period,
           COALESCE(SUM(total_amount),0) as total, COUNT(*) as count
         FROM purchases
         WHERE organization_id = ? AND DATE_FORMAT(date, '%Y-%m') = ? AND status != 'CANCELLED'
         GROUP BY DATE_FORMAT(date, '%Y-%m-%d')
         ORDER BY period ASC`,
        [organizationId, monthKey]
      ) as any[][]
      chartSales = dailySales
      chartPurchases = dailyPurchases
    } else {
      const [monthlySales] = await db.execute(
        `SELECT DATE_FORMAT(date, '%Y-%m') as period,
           COALESCE(SUM(total_amount),0) as total, COUNT(*) as count
         FROM invoices
         WHERE organization_id = ? AND YEAR(date) = ?
         GROUP BY DATE_FORMAT(date, '%Y-%m')
         ORDER BY period ASC`,
        [organizationId, year]
      ) as any[][]
      const [monthlyPurchases] = await db.execute(
        `SELECT DATE_FORMAT(date, '%Y-%m') as period,
           COALESCE(SUM(total_amount),0) as total, COUNT(*) as count
         FROM purchases
         WHERE organization_id = ? AND YEAR(date) = ? AND status != 'CANCELLED'
         GROUP BY DATE_FORMAT(date, '%Y-%m')
         ORDER BY period ASC`,
        [organizationId, year]
      ) as any[][]
      chartSales = monthlySales
      chartPurchases = monthlyPurchases
    }

    let paymentWhere = 'organization_id = ?'
    let paymentParams: any[] = [organizationId]

    if (monthParam && /^\d{1,2}$/.test(monthParam)) {
      const monthKey = `${year}-${monthParam.padStart(2, '0')}`
      paymentWhere += " AND DATE_FORMAT(payment_date, '%Y-%m') = ?"
      paymentParams.push(monthKey)
    } else {
      paymentWhere += " AND YEAR(payment_date) = ?"
      paymentParams.push(year)
    }

    const [[paymentsSummaryRow]] = await db.execute(
      `SELECT 
         COALESCE(SUM(CASE WHEN type = 'INWARD' THEN amount ELSE 0 END), 0) as total_inward,
         COALESCE(SUM(CASE WHEN type = 'OUTWARD' THEN amount ELSE 0 END), 0) as total_outward
       FROM payments
       WHERE ${paymentWhere}`,
      paymentParams
    ) as any[][]

    const totalInward = Number(paymentsSummaryRow?.total_inward || 0)
    const totalOutward = Number(paymentsSummaryRow?.total_outward || 0)
    const netCashflow = totalInward - totalOutward

    return NextResponse.json({
      salesThisMonth: { amount: Number(salesThisMonth.amount), count: Number(salesThisMonth.count) },
      purchasesThisMonth: { amount: Number(purchasesThisMonth.amount), count: Number(purchasesThisMonth.count) },
      pendingQuotations: Number(pendingQuotRow.count),
      lowStockCount: Number(lowStockRow.count),
      paymentsSummary: {
        totalInward,
        totalOutward,
        netCashflow,
      },
      chartType,
      chartYear: year,
      chartMonth: monthParam || null,
      chartSales,
      chartPurchases,
    })
  } catch (err: any) {
    console.error('Dashboard API error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
