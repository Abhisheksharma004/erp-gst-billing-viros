'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, AlertTriangle, Package, ExternalLink, RefreshCw, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface LowStockItem {
  id: string
  name: string
  sku: string | null
  current_stock: number
  low_stock_alert: number
  category_name: string | null
  unit_name: string | null
}

export function NotificationsDropdown() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([])
  const [lowStockCount, setLowStockCount] = useState(0)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) {
        const data = await res.json()
        setLowStockItems(data.lowStockItems || [])
        setLowStockCount(data.lowStockCount || 0)
      }
    } catch (err) {
      console.error('Fetch notifications error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications, pathname])

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
      {/* Bell Button with Dynamic Count Badge */}
      <Button
        variant="ghost"
        size="icon"
        aria-label="Notifications"
        className="relative"
        onClick={() => {
          const next = !open
          setOpen(next)
          if (next) fetchNotifications()
        }}
      >
        <Bell className="h-5 w-5 text-foreground" />
        {lowStockCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-background animate-in zoom-in-50">
            {lowStockCount > 99 ? '99+' : lowStockCount}
          </span>
        )}
      </Button>

      {/* Notifications Dropdown Panel */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-border bg-popover text-popover-foreground shadow-xl z-50 overflow-hidden animate-in fade-in-50 slide-in-from-top-2">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-muted/30">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-600">
                <Bell className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Notifications</h3>
                <p className="text-xs text-muted-foreground">
                  {lowStockCount > 0 ? `${lowStockCount} inventory items low on stock` : 'System notifications'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title="Refresh notifications"
                onClick={fetchNotifications}
                disabled={loading}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {/* List Content */}
          <div className="max-h-80 overflow-y-auto divide-y divide-border">
            {loading && lowStockItems.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                Loading notifications...
              </div>
            ) : lowStockItems.length === 0 ? (
              <div className="p-6 text-center space-y-2">
                <div className="mx-auto w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium text-foreground">All Stock Healthy</p>
                <p className="text-xs text-muted-foreground">No low stock alerts at this time.</p>
              </div>
            ) : (
              lowStockItems.map((item) => {
                const isZero = item.current_stock <= 0
                return (
                  <Link
                    key={item.id}
                    href={`/inventory?search=${encodeURIComponent(item.name)}`}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 p-3.5 hover:bg-accent/60 transition-colors group"
                  >
                    <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${isZero ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300'}`}>
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-xs text-foreground truncate group-hover:text-primary transition-colors">
                          {item.name}
                        </span>
                        <Badge
                          variant="outline"
                          className={
                            isZero
                              ? 'bg-rose-50 text-rose-700 border-rose-300 text-[10px] px-1.5 py-0 shrink-0 font-bold'
                              : 'bg-amber-50 text-amber-700 border-amber-300 text-[10px] px-1.5 py-0 shrink-0 font-semibold'
                          }
                        >
                          {isZero ? 'Out of Stock' : 'Low Stock'}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          Available: <strong className={isZero ? 'text-rose-600 font-bold' : 'text-amber-600 font-bold'}>{Math.max(0, Number(item.current_stock ?? 0))} {item.unit_name || 'units'}</strong>
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Alert Level: {item.low_stock_alert}
                        </span>
                      </div>

                      {item.category_name && (
                        <p className="text-[11px] text-muted-foreground truncate">
                          Category: {item.category_name}
                        </p>
                      )}
                    </div>
                  </Link>
                )
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-border bg-muted/20 text-center">
            <Link
              href="/inventory"
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-primary hover:underline py-1 w-full"
            >
              <Package className="h-3.5 w-3.5" />
              View Inventory Items
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
