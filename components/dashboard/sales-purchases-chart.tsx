'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'

export type DashboardChartRow = {
  key: string
  label: string
  sales: number
  purchases: number
  salesCount: number
  purchasesCount: number
}

interface SalesPurchasesChartProps {
  data: DashboardChartRow[]
  chartType: 'monthly' | 'daily'
  month: string
  xLabel: string
  onChartClick?: (state: { activePayload?: { payload?: { key?: string } }[] }) => void
}

const CustomTooltip = ({ active, payload, label, xLabel }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-slate-200/90 bg-white/95 p-3.5 shadow-xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95">
        <p className="mb-2.5 text-xs font-bold text-slate-500 dark:text-slate-400">
          {xLabel}: <span className="text-slate-900 dark:text-slate-100">{label}</span>
        </p>
        <div className="space-y-2">
          {payload.map((entry: any, index: number) => {
            const isSales = entry.dataKey === 'sales'
            const count = isSales ? entry.payload?.salesCount : entry.payload?.purchasesCount
            const color = isSales ? '#2563eb' : '#9333ea'
            return (
              <div key={`item-${index}`} className="flex items-center justify-between gap-4 text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full shadow-sm" style={{ backgroundColor: color }} />
                  <span className="text-slate-700 dark:text-slate-300">{entry.name}:</span>
                </div>
                <div className="text-right">
                  <span className="font-bold" style={{ color }}>{formatCurrency(entry.value)}</span>
                  {count != null && (
                    <span className="ml-1.5 text-[11px] font-normal text-slate-500 dark:text-slate-400">({count} txn)</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }
  return null
}

export function SalesPurchasesChart({
  data,
  chartType,
  month,
  xLabel,
  onChartClick,
}: SalesPurchasesChartProps) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart
        data={data}
        onClick={onChartClick}
        style={{ cursor: month === 'ALL' ? 'pointer' : 'default' }}
        margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
      >
        <defs>
          <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
          </linearGradient>
          <linearGradient id="purchasesGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#9333ea" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#9333ea" stopOpacity={0.0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }}
          interval={chartType === 'daily' ? 2 : 0}
          angle={chartType === 'daily' ? -45 : -20}
          textAnchor="end"
          height={55}
          axisLine={{ stroke: '#e2e8f0' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }}
          tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip xLabel={xLabel} />} />
        <Legend
          verticalAlign="top"
          align="center"
          iconType="circle"
          wrapperStyle={{ paddingBottom: '16px' }}
          formatter={(value) => (
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 mr-3">
              {value}
            </span>
          )}
        />
        <Area
          type="monotone"
          dataKey="sales"
          name="Sales"
          stroke="#2563eb"
          strokeWidth={2.5}
          fill="url(#salesGradient)"
          activeDot={{ r: 5, stroke: '#2563eb', strokeWidth: 2, fill: '#ffffff' }}
          dot={false}
        />
        <Area
          type="monotone"
          dataKey="purchases"
          name="Purchases"
          stroke="#9333ea"
          strokeWidth={2.5}
          fill="url(#purchasesGradient)"
          activeDot={{ r: 5, stroke: '#9333ea', strokeWidth: 2, fill: '#ffffff' }}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

