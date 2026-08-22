'use client'

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface InvoiceCountPieChartProps {
  salesCount: number
  purchasesCount: number
  periodLabel?: string
}

const COLORS = ['#2563eb', '#9333ea']

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0]
    return (
      <div className="rounded-xl border border-slate-200/90 bg-white/95 p-3 shadow-xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95">
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span
            className="h-2.5 w-2.5 rounded-full shadow-sm"
            style={{ backgroundColor: data.payload.fill }}
          />
          <span className="text-slate-700 dark:text-slate-300">{data.name}:</span>
          <span className="font-bold text-slate-900 dark:text-slate-100">
            {data.value} invoice(s)
          </span>
        </div>
      </div>
    )
  }
  return null
}

export function InvoiceCountPieChart({
  salesCount,
  purchasesCount,
}: InvoiceCountPieChartProps) {
  const total = salesCount + purchasesCount

  const data = [
    { name: 'Sales Invoices', value: salesCount, fill: COLORS[0] },
    { name: 'Purchase Invoices', value: purchasesCount, fill: COLORS[1] },
  ]

  const salesPercent = total > 0 ? Math.round((salesCount / total) * 100) : 0
  const purchasesPercent = total > 0 ? Math.round((purchasesCount / total) * 100) : 0

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[280px] text-center p-4">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          No invoice data available for this period
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-between h-full min-h-[300px]">
      <div className="relative w-full h-[220px] flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={5}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Center content inside donut */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">
            {total}
          </span>
          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total Invoices
          </span>
        </div>
      </div>

      {/* Custom Legend / Summary Badges */}
      <div className="w-full grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
        <div className="flex flex-col items-center p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/30">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300">
            <span className="h-2 w-2 rounded-full bg-blue-600" />
            Sales
          </div>
          <p className="text-base font-bold text-blue-800 dark:text-blue-200 mt-0.5">
            {salesCount} <span className="text-xs font-normal text-blue-600">({salesPercent}%)</span>
          </p>
        </div>

        <div className="flex flex-col items-center p-2.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/30">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-700 dark:text-purple-300">
            <span className="h-2 w-2 rounded-full bg-purple-600" />
            Purchase
          </div>
          <p className="text-base font-bold text-purple-800 dark:text-purple-200 mt-0.5">
            {purchasesCount} <span className="text-xs font-normal text-purple-600">({purchasesPercent}%)</span>
          </p>
        </div>
      </div>
    </div>
  )
}
