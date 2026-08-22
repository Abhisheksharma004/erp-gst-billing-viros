'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import {
  TrendingUp, ShoppingCart, FileText, AlertTriangle, ArrowDownLeft, ArrowUpRight, Wallet
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'
import { DashboardPageSkeleton } from '@/components/layout/page-loader'

const SalesPurchasesChart = dynamic(
  () =>
    import('@/components/dashboard/sales-purchases-chart').then((m) => ({
      default: m.SalesPurchasesChart,
    })),
  {
    ssr: false,
    loading: () => <div className="h-[280px] animate-pulse rounded-lg bg-muted" />,
  }
)

const InvoiceCountPieChart = dynamic(
  () =>
    import('@/components/dashboard/invoice-count-pie-chart').then((m) => ({
      default: m.InvoiceCountPieChart,
    })),
  {
    ssr: false,
    loading: () => <div className="h-[280px] animate-pulse rounded-lg bg-muted" />,
  }
)

interface ChartRow {
  period: string
  total: number
  count: number
}

interface DashboardStats {
  salesThisMonth: { amount: number; count: number }
  purchasesThisMonth: { amount: number; count: number }
  pendingQuotations: number
  lowStockCount: number
  paymentsSummary?: {
    totalInward: number
    totalOutward: number
    netCashflow: number
  }
  chartType: 'monthly' | 'daily'
  chartYear: number
  chartMonth: string | null
  chartSales: ChartRow[]
  chartPurchases: ChartRow[]
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function StatCard({
  title, value, sub, icon: Icon, color, badge, href,
}: {
  title: string; value: string; sub?: string; icon: any; color: string; badge?: string; href: string
}) {
  return (
    <Link href={href} className="block group">
      <Card className="transition-shadow hover:shadow-md cursor-pointer h-full">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{title}</p>
              <p className="text-2xl font-bold mt-1">{value}</p>
              {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
            </div>
            <div className={`p-2 rounded-lg ${color}`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
          </div>
          {badge && (
            <Badge variant="secondary" className="mt-3 text-xs">{badge}</Badge>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}

function formatMonthLabel(period: string) {
  const [y, m] = period.split('-')
  const date = new Date(Number(y), Number(m) - 1)
  return date.toLocaleString('default', { month: 'short', year: '2-digit' })
}

function formatDayLabel(period: string) {
  const d = new Date(period + 'T00:00:00')
  return d.toLocaleString('default', { day: 'numeric', month: 'short' })
}

function getYearMonthKeys(year: number): string[] {
  const keys: string[] = []
  const limit = year === new Date().getFullYear() ? new Date().getMonth() + 1 : 12
  for (let m = 1; m <= limit; m++) {
    keys.push(`${year}-${String(m).padStart(2, '0')}`)
  }
  return keys
}

function getDaysInMonth(year: number, month: number): string[] {
  const days = new Date(year, month, 0).getDate()
  const keys: string[] = []
  const m = String(month).padStart(2, '0')
  for (let d = 1; d <= days; d++) {
    keys.push(`${year}-${m}-${String(d).padStart(2, '0')}`)
  }
  return keys
}

function buildChartData(
  chartType: 'monthly' | 'daily',
  year: number,
  month: string | null,
  chartSales: ChartRow[],
  chartPurchases: ChartRow[]
) {
  const salesMap = Object.fromEntries(
    chartSales.map((s) => [s.period, { total: Number(s.total), count: Number(s.count) }])
  )
  const purchasesMap = Object.fromEntries(
    chartPurchases.map((p) => [p.period, { total: Number(p.total), count: Number(p.count) }])
  )

  if (chartType === 'daily' && month) {
    const monthNum = parseInt(month, 10)
    return getDaysInMonth(year, monthNum).map((key) => ({
      key,
      label: formatDayLabel(key),
      sales: salesMap[key]?.total ?? 0,
      purchases: purchasesMap[key]?.total ?? 0,
      salesCount: salesMap[key]?.count ?? 0,
      purchasesCount: purchasesMap[key]?.count ?? 0,
    }))
  }

  return getYearMonthKeys(year).map((key) => ({
    key,
    label: formatMonthLabel(key),
    sales: salesMap[key]?.total ?? 0,
    purchases: purchasesMap[key]?.total ?? 0,
    salesCount: salesMap[key]?.count ?? 0,
    purchasesCount: purchasesMap[key]?.count ?? 0,
  }))
}

function getYearOptions() {
  const current = new Date().getFullYear()
  const years: number[] = []
  for (let y = current; y >= current - 5; y--) years.push(y)
  return years
}

export default function DashboardPage() {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0')
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [chartLoading, setChartLoading] = useState(false)
  const [year, setYear] = useState(String(currentYear))
  const [month, setMonth] = useState(currentMonth)

  const isFirstLoad = useRef(true)

  const fetchDashboard = useCallback(async (selectedYear: string, selectedMonth: string) => {
    if (isFirstLoad.current) setLoading(true)
    else setChartLoading(true)
    try {
      const params = new URLSearchParams({ year: selectedYear })
      if (selectedMonth !== 'ALL') params.set('month', selectedMonth)
      const res = await fetch(`/api/dashboard?${params}`)
      const data = await res.json()
      setStats(data)
    } finally {
      if (isFirstLoad.current) {
        setLoading(false)
        isFirstLoad.current = false
      } else {
        setChartLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    fetchDashboard(year, month)
  }, [year, month, fetchDashboard])

  if (loading || !stats) {
    return <DashboardPageSkeleton />
  }

  const chartData = buildChartData(
    stats.chartType,
    stats.chartYear,
    stats.chartMonth,
    stats.chartSales,
    stats.chartPurchases
  )

  const periodLabel =
    month !== 'ALL'
      ? `${MONTH_NAMES[parseInt(month, 10) - 1]} ${year}`
      : `Year ${year}`

  const xLabel = stats.chartType === 'daily' ? 'Day' : 'Month'
  const isMonthView = month !== 'ALL'

  const monthTotals = isMonthView
    ? chartData.reduce(
        (acc, row) => ({
          sales: acc.sales + row.sales,
          purchases: acc.purchases + row.purchases,
          salesCount: acc.salesCount + row.salesCount,
          purchasesCount: acc.purchasesCount + row.purchasesCount,
        }),
        { sales: 0, purchases: 0, salesCount: 0, purchasesCount: 0 }
      )
    : null

  const handleChartClick = (state: { activePayload?: { payload?: { key?: string } }[] }) => {
    if (month !== 'ALL' || stats.chartType !== 'monthly') return
    const key = state?.activePayload?.[0]?.payload?.key
    if (!key) return
    const monthPart = key.split('-')[1]
    if (monthPart) setMonth(monthPart)
  }

  const totalSalesCount = monthTotals ? monthTotals.salesCount : chartData.reduce((acc, c) => acc + c.salesCount, 0)
  const totalPurchasesCount = monthTotals ? monthTotals.purchasesCount : chartData.reduce((acc, c) => acc + c.purchasesCount, 0)

  return (
    <div className="space-y-6">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Sales (This Month)"
          value={formatCurrency(stats.salesThisMonth.amount)}
          sub={`${stats.salesThisMonth.count} invoice(s)`}
          icon={TrendingUp}
          color="bg-blue-600"
          href="/billing"
        />
        <StatCard
          title="Purchases (This Month)"
          value={formatCurrency(stats.purchasesThisMonth.amount)}
          sub={`${stats.purchasesThisMonth.count} bill(s)`}
          icon={ShoppingCart}
          color="bg-purple-600"
          href="/purchases"
        />
        <StatCard
          title="Pending Quotations"
          value={String(stats.pendingQuotations)}
          sub="Awaiting approval"
          icon={FileText}
          color="bg-amber-600"
          href="/quotations"
        />
        <StatCard
          title="Low Stock Items"
          value={String(stats.lowStockCount)}
          sub="Reorder needed"
          icon={AlertTriangle}
          color="bg-rose-600"
          badge={stats.lowStockCount > 0 ? 'Attention Needed' : undefined}
          href="/inventory"
        />
      </div>

      {/* Cashflow Summary Cards */}
      {stats.paymentsSummary && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Link href="/payments" className="block group">
            <Card className="transition-shadow hover:shadow-md cursor-pointer border-emerald-100 dark:border-emerald-950">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Total Inward</span>
                  <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-xl font-bold text-emerald-800 dark:text-emerald-300 mt-1">
                  {formatCurrency(stats.paymentsSummary.totalInward)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Received ({periodLabel})
                </p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/payments" className="block group">
            <Card className="transition-shadow hover:shadow-md cursor-pointer border-amber-100 dark:border-amber-950">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Total Outward</span>
                  <ArrowUpRight className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-xl font-bold text-amber-800 dark:text-amber-300 mt-1">
                  {formatCurrency(stats.paymentsSummary.totalOutward)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Paid ({periodLabel})
                </p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/payments" className="block group">
            <Card className="transition-shadow hover:shadow-md cursor-pointer border-blue-100 dark:border-blue-950">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-blue-700 dark:text-blue-400">Net Cashflow</span>
                  <Wallet className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-xl font-bold text-blue-800 dark:text-blue-300 mt-1">
                  {formatCurrency(stats.paymentsSummary.netCashflow)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Net difference (Inward - Outward) ({periodLabel})
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      )}

      {/* Main Charts Grid */}
      <div className="relative">
        {chartLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 rounded-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Area Chart */}
          <Card className="lg:col-span-2 flex flex-col justify-between">
            <CardHeader className="space-y-4 pb-2">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-base">
                  Sales vs Purchases ({periodLabel})
                </CardTitle>
                <div className="flex flex-wrap items-end gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Year</Label>
                    <Select value={year} onValueChange={setYear}>
                      <SelectTrigger className="h-9 w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getYearOptions().map((y) => (
                          <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Month</Label>
                    <Select value={month} onValueChange={setMonth}>
                      <SelectTrigger className="h-9 w-[140px]">
                        <SelectValue placeholder="Select month" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Months</SelectItem>
                        {MONTH_NAMES.map((name, i) => (
                          <SelectItem key={name} value={String(i + 1).padStart(2, '0')}>
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              {isMonthView && monthTotals && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm pt-1">
                  <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/80 to-blue-50/20 p-3 shadow-sm dark:border-blue-900/40 dark:from-blue-950/30 dark:to-transparent">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">Sales</p>
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                        {monthTotals.salesCount} invoice(s)
                      </span>
                    </div>
                    <p className="mt-1 text-lg font-bold tracking-tight text-blue-700 dark:text-blue-300">
                      {formatCurrency(monthTotals.sales)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-purple-100 bg-gradient-to-br from-purple-50/80 to-purple-50/20 p-3 shadow-sm dark:border-purple-900/40 dark:from-purple-950/30 dark:to-transparent">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-purple-600 dark:text-purple-400">Purchases</p>
                      <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700 dark:bg-purple-900/60 dark:text-purple-300">
                        {monthTotals.purchasesCount} bill(s)
                      </span>
                    </div>
                    <p className="mt-1 text-lg font-bold tracking-tight text-purple-700 dark:text-purple-300">
                      {formatCurrency(monthTotals.purchases)}
                    </p>
                  </div>
                </div>
              )}
              {!isMonthView && (
                <p className="text-xs text-muted-foreground">
                  Select a month from the dropdown, or click a month on the chart for day-wise data.
                </p>
              )}
            </CardHeader>
            <CardContent>
              <SalesPurchasesChart
                data={chartData}
                chartType={stats.chartType}
                month={month}
                xLabel={xLabel}
                onChartClick={handleChartClick}
              />
            </CardContent>
          </Card>

          {/* Invoice Count Pie Chart */}
          <Card className="lg:col-span-1 flex flex-col justify-between">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Invoice Ratio ({periodLabel})
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Distribution of sales vs purchase invoices
              </p>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-center pt-2">
              <InvoiceCountPieChart
                salesCount={totalSalesCount}
                purchasesCount={totalPurchasesCount}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
