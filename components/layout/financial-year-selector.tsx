'use client'

import { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronDown, Check } from 'lucide-react'
import { useAppStore } from '@/store/app-store'

export function getAvailableFinancialYears(): string[] {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()
  const startYear = currentMonth >= 3 ? currentYear : currentYear - 1

  const list: string[] = []
  // Generate current FY + 3 previous FYs
  for (let i = 0; i < 4; i++) {
    const y = startYear - i
    const nextYShort = String((y + 1) % 100).padStart(2, '0')
    list.push(`FY ${y}-${nextYShort}`)
  }
  return list
}

export function FinancialYearSelector() {
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const financialYear = useAppStore((s) => s.financialYear)
  const setFinancialYear = useAppStore((s) => s.setFinancialYear)

  const availableYears = getAvailableFinancialYears()
  const activeYear = financialYear || availableYears[0]

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-accent/40 hover:bg-accent px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors shadow-xs"
        aria-label="Select Financial Year"
        title="Active Financial Year"
      >
        <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="truncate">{activeYear}</span>
        <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 rounded-xl border border-border bg-popover p-1.5 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/60 mb-1">
            Financial Year (FY)
          </div>
          <div className="space-y-0.5">
            {availableYears.map((fy, index) => {
              const isSelected = activeYear === fy
              return (
                <button
                  key={fy}
                  onClick={() => {
                    setFinancialYear(fy)
                    setOpen(false)
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    isSelected
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'hover:bg-accent text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{fy}</span>
                    {index === 0 && (
                      <span className="text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold px-1.5 py-0.5 rounded">
                        Current
                      </span>
                    )}
                  </div>
                  {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
