'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  LayoutDashboard,
  Package,
  FileText,
  ShoppingCart,
  Users,
  Truck,
  ClipboardList,
  ShoppingBag,
  Send,
  RotateCcw,
  BarChart3,
  UserCog,
  Shield,
  Settings,
  Building2,
  Wallet,
  ChevronDown,
  FileCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEffect, useMemo, useState, useCallback } from 'react'
import { useAppStore } from '@/store/app-store'
import { DEFAULT_SIDEBAR_COLOR, normalizeSidebarColor } from '@/lib/theme'

interface Branding {
  companyName: string
  logo: string | null
  sidebarColor: string
}

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  permission?: string
  adminOnly?: boolean
  children?: Array<{
    title: string
    href: string
    permission?: string
  }>
}

const navItems: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, permission: 'dashboard:view' },
  { title: 'Inventory', href: '/inventory', icon: Package, permission: 'inventory:view' },
  { title: 'Customers', href: '/customers', icon: Users, permission: 'customers:view' },
  { title: 'Vendors', href: '/vendors', icon: Truck, permission: 'vendors:view' },
  { title: 'Quotations', href: '/quotations', icon: ClipboardList, permission: 'quotations:view' },
  { title: 'Proforma', href: '/proformas', icon: FileCheck, permission: 'proformas:view' },
  { title: 'Sales Invoice', href: '/billing', icon: FileText, permission: 'billing:view' },
  { title: 'Payments', href: '/payments', icon: Wallet, permission: 'payments:view' },
  { title: 'Purchase Orders', href: '/purchase-orders', icon: ShoppingBag, permission: 'purchase-orders:view' },
  { title: 'Purchase Invoice', href: '/purchases', icon: ShoppingCart, permission: 'purchases:view' },
  { title: 'Delivery Challans', href: '/delivery-challans', icon: Send, permission: 'delivery-challans:view' },
  { title: 'Returnable Challans', href: '/returnable-challans', icon: RotateCcw, permission: 'returnable-challans:view' },
  { title: 'Reports', href: '/reports', icon: BarChart3, permission: 'reports:view' },
  { title: 'Staff', href: '/staff', icon: UserCog, adminOnly: true },
  { title: 'Staff Permissions', href: '/roles', icon: Shield, adminOnly: true },
  { title: 'Settings', href: '/settings', icon: Settings, adminOnly: true },
]

interface SidebarProps {
  open: boolean
}

interface CachedAuth {
  isAdmin: boolean
  isOrgAdmin: boolean
  permissions: string[]
}

export function Sidebar({ open }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session, status } = useSession()
  const { mobileSidebarOpen, setMobileSidebarOpen } = useAppStore()

  // Local storage cache to prevent flash of black sidebar on refresh
  const [cachedAuth, setCachedAuth] = useState<CachedAuth | null>(null)
  const [branding, setBranding] = useState<Branding>({
    companyName: 'Viros GST',
    logo: null,
    sidebarColor: DEFAULT_SIDEBAR_COLOR,
  })

  // Read cached auth immediately on client mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('viros_sidebar_auth_cache')
      if (stored) {
        setCachedAuth(JSON.parse(stored))
      }
    } catch {}
  }, [])

  // Sync auth cache with live session
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      const auth: CachedAuth = {
        isAdmin: session.user.role === 'ADMIN',
        isOrgAdmin: session.user.orgRole === 'OWNER' || session.user.orgRole === 'ADMIN',
        permissions: session.user.permissions || [],
      }
      setCachedAuth(auth)
      try {
        localStorage.setItem('viros_sidebar_auth_cache', JSON.stringify(auth))
      } catch {}
    } else if (status === 'unauthenticated') {
      try {
        localStorage.removeItem('viros_sidebar_auth_cache')
      } catch {}
      setCachedAuth(null)
    }
  }, [session, status])

  const loadBranding = () => {
    fetch('/api/auth/branding')
      .then((r) => r.json())
      .then((data: Branding) => {
        setBranding({
          companyName: data?.companyName || 'Viros GST',
          logo: data?.logo ?? null,
          sidebarColor: normalizeSidebarColor(data?.sidebarColor),
        })
      })
      .catch(() => {})
  }

  useEffect(() => {
    setMobileSidebarOpen(false)
  }, [pathname, setMobileSidebarOpen])

  useEffect(() => {
    loadBranding()
    window.addEventListener('branding-updated', loadBranding)
    return () => window.removeEventListener('branding-updated', loadBranding)
  }, [])

  const [paymentsOpen, setPaymentsOpen] = useState(false)

  // Use live session data when authenticated, or fallback to cachedAuth on refresh
  const effectiveIsAdmin =
    status === 'authenticated'
      ? session?.user?.role === 'ADMIN'
      : (cachedAuth?.isAdmin ?? false)

  const effectiveIsOrgAdmin =
    status === 'authenticated'
      ? session?.user?.orgRole === 'OWNER' || session?.user?.orgRole === 'ADMIN'
      : (cachedAuth?.isOrgAdmin ?? false)

  const effectivePermissions =
    status === 'authenticated'
      ? session?.user?.permissions || []
      : (cachedAuth?.permissions ?? [])

  const isVisible = useCallback(
    (item: NavItem): boolean => {
      if (item.adminOnly) return effectiveIsOrgAdmin
      if (!item.permission) return true
      const [module, action] = item.permission.split(':')
      return (
        effectiveIsAdmin ||
        effectivePermissions.includes('*') ||
        effectivePermissions.includes(`${module}:${action}`)
      )
    },
    [effectiveIsAdmin, effectiveIsOrgAdmin, effectivePermissions]
  )

  useEffect(() => {
    if (pathname.startsWith('/payments')) {
      setPaymentsOpen(true)
    }
  }, [pathname])

  const visibleItems = useMemo(() => navItems.filter(isVisible), [isVisible])
  const showLabels = open || mobileSidebarOpen

  useEffect(() => {
    visibleItems.forEach((item) => router.prefetch(item.href))
  }, [visibleItems, router])

  // Show shimmer skeleton animation only if session is initializing and no cache is available yet
  const showSkeleton = status === 'loading' && visibleItems.length === 0

  return (
    <aside
      style={{ backgroundColor: branding.sidebarColor }}
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col text-white transition-all duration-300 ease-in-out',
        'w-64 -translate-x-full md:translate-x-0 shadow-xl',
        mobileSidebarOpen && 'translate-x-0',
        open ? 'md:w-64' : 'md:w-16'
      )}
    >
      {/* Brand Header */}
      <div className="flex h-14 md:h-16 items-center border-b border-white/10 px-4 min-w-0 shrink-0">
        {branding.logo ? (
          <img
            src={branding.logo}
            alt={branding.companyName}
            className="h-7 w-7 md:h-8 md:w-8 shrink-0 object-contain rounded-lg shadow-sm"
          />
        ) : (
          <Building2 className="h-7 w-7 md:h-8 md:w-8 text-blue-400 shrink-0" />
        )}
        {showLabels && (
          <span className="ml-3 text-base md:text-lg font-bold text-white truncate tracking-tight">
            {branding.companyName}
          </span>
        )}
      </div>

      {/* Navigation Links or Skeleton Shimmer Pattern */}
      <nav className="flex-1 min-h-0 overflow-y-auto py-3 px-2 scrollbar-thin scrollbar-thumb-white/10">
        {showSkeleton ? (
          <div className="space-y-1.5 py-1 px-1 animate-in fade-in duration-300">
            {Array.from({ length: 9 }).map((_, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.03] animate-shimmer overflow-hidden relative"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className="h-5 w-5 rounded-md bg-white/15 shrink-0" />
                {showLabels && (
                  <div
                    className="h-3 rounded-md bg-white/15"
                    style={{ width: `${55 + ((idx * 21) % 35)}%` }}
                  />
                )}
              </div>
            ))}
          </div>
        ) : (
          <ul className="space-y-1 animate-in fade-in duration-200">
            {visibleItems.map((item) => {
              const isParentActive = pathname === item.href || pathname.startsWith(item.href + '/')
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

              if (item.children?.length) {
                return (
                  <li key={item.href}>
                    <button
                      type="button"
                      onClick={() => setPaymentsOpen((prev) => !prev)}
                      className={cn(
                        'group flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-150',
                        isParentActive
                          ? 'bg-primary text-primary-foreground font-semibold shadow-md shadow-primary/25 relative'
                          : 'text-slate-200 hover:bg-white/10 hover:text-white hover:translate-x-1'
                      )}
                      title={!showLabels ? item.title : undefined}
                    >
                      {isParentActive && (
                        <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-white shadow-sm" />
                      )}
                      <span className="flex items-center gap-3">
                        <item.icon className="h-5 w-5 shrink-0 transition-transform duration-150 group-hover:scale-105" />
                        {showLabels && <span className="truncate">{item.title}</span>}
                      </span>
                      {showLabels && (
                        <ChevronDown
                          className={cn(
                            'h-4 w-4 transition-transform duration-200 text-slate-300',
                            paymentsOpen && 'rotate-180 text-white'
                          )}
                        />
                      )}
                    </button>
                    {paymentsOpen && showLabels && (
                      <ul className="mt-1 space-y-1 pl-10 animate-in slide-in-from-top-1 fade-in duration-150">
                        {item.children.map((child) => {
                          const isChildActive =
                            pathname === child.href || pathname.startsWith(child.href + '/')
                          return (
                            <li key={child.href}>
                              <Link
                                href={child.href}
                                prefetch
                                onMouseEnter={() => router.prefetch(child.href)}
                                className={cn(
                                  'block rounded-lg px-3 py-2 text-xs font-medium transition-all duration-150',
                                  isChildActive
                                    ? 'bg-primary/90 text-primary-foreground font-semibold shadow-sm'
                                    : 'text-slate-300 hover:bg-white/10 hover:text-white hover:translate-x-1'
                                )}
                              >
                                {child.title}
                              </Link>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </li>
                )
              }

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    prefetch
                    onMouseEnter={() => router.prefetch(item.href)}
                    className={cn(
                      'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-150 relative',
                      isActive
                        ? 'bg-primary text-primary-foreground font-semibold shadow-md shadow-primary/25'
                        : 'text-slate-200 hover:bg-white/10 hover:text-white hover:translate-x-1'
                    )}
                    title={!showLabels ? item.title : undefined}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-white shadow-sm" />
                    )}
                    <item.icon className="h-5 w-5 shrink-0 transition-transform duration-150 group-hover:scale-105" />
                    {showLabels && <span className="truncate">{item.title}</span>}
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </nav>
    </aside>
  )
}
