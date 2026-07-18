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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEffect, useMemo, useState } from 'react'
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
  { title: 'Sales Invoice', href: '/billing', icon: FileText, permission: 'billing:view' },
  {
    title: 'Payments',
    href: '/payments',
    icon: Wallet,
    permission: 'payments:view',
    children: [
      { title: 'Inward', href: '/payments/inward', permission: 'payments:view' },
      { title: 'Outward', href: '/payments/outward', permission: 'payments:view' },
    ],
  },
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

export function Sidebar({ open }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const permissions = session?.user?.permissions || []
  const isAdmin = session?.user?.role === 'ADMIN'
  const { mobileSidebarOpen, setMobileSidebarOpen } = useAppStore()
  const [branding, setBranding] = useState<Branding>({
    companyName: 'Viros GST',
    logo: null,
    sidebarColor: DEFAULT_SIDEBAR_COLOR,
  })

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

  const isOrgAdmin = session?.user?.orgRole === 'OWNER' || session?.user?.orgRole === 'ADMIN'

  const [paymentsOpen, setPaymentsOpen] = useState(false)

  const isVisible = (item: NavItem): boolean => {
    if (item.adminOnly) return isOrgAdmin
    if (!item.permission) return true
    const [module, action] = item.permission.split(':')
    return isAdmin || permissions.includes(`${module}:${action}`)
  }

  useEffect(() => {
    if (pathname.startsWith('/payments')) {
      setPaymentsOpen(true)
    }
  }, [pathname])

  const visibleItems = useMemo(() => navItems.filter(isVisible), [isAdmin, permissions])
  const showLabels = open || mobileSidebarOpen

  useEffect(() => {
    visibleItems.forEach((item) => router.prefetch(item.href))
  }, [visibleItems, router])

  return (
    <aside
      style={{ backgroundColor: branding.sidebarColor }}
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col text-white transition-transform duration-300 ease-in-out',
        'w-64 -translate-x-full md:translate-x-0',
        mobileSidebarOpen && 'translate-x-0',
        open ? 'md:w-64' : 'md:w-16'
      )}
    >
      <div className="flex h-14 md:h-16 items-center border-b border-white/10 px-4 min-w-0">
        {branding.logo ? (
          <img
            src={branding.logo}
            alt={branding.companyName}
            className="h-7 w-7 md:h-8 md:w-8 shrink-0 object-contain"
          />
        ) : (
          <Building2 className="h-7 w-7 md:h-8 md:w-8 text-blue-400 shrink-0" />
        )}
        {showLabels && (
          <span className="ml-3 text-base md:text-lg font-bold text-white truncate">
            {branding.companyName}
          </span>
        )}
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto py-3 px-2">
        <ul className="space-y-1">
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
                      'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                      isParentActive
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-slate-200 hover:bg-white/10 hover:text-white'
                    )}
                    title={!showLabels ? item.title : undefined}
                  >
                    <span className="flex items-center gap-3">
                      <item.icon className="h-5 w-5 shrink-0" />
                      {showLabels && <span className="truncate">{item.title}</span>}
                    </span>
                    {showLabels && (
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 transition-transform',
                          paymentsOpen && 'rotate-180'
                        )}
                      />
                    )}
                  </button>
                  {paymentsOpen && showLabels && (
                    <ul className="mt-1 space-y-1 pl-10">
                      {item.children.map((child) => {
                        const isChildActive = pathname === child.href || pathname.startsWith(child.href + '/')
                        return (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              prefetch
                              onMouseEnter={() => router.prefetch(child.href)}
                              className={cn(
                                'block rounded-lg px-3 py-2 text-sm transition-colors',
                                isChildActive
                                  ? 'bg-primary/90 text-primary-foreground'
                                  : 'text-slate-200 hover:bg-white/10 hover:text-white'
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
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-slate-200 hover:bg-white/10 hover:text-white'
                  )}
                  title={!showLabels ? item.title : undefined}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {showLabels && <span className="truncate">{item.title}</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}
