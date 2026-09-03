'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import {
  Building2,
  Database,
  LayoutDashboard,
  LogOut,
  ArrowRight,
  Menu,
  X,
  Activity,
  User,
  ChevronRight,
  ExternalLink,
  RotateCcw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const navItems = [
  {
    title: 'Overview',
    href: '/superadmin',
    icon: LayoutDashboard,
    badgeKey: null,
  },
  {
    title: 'Organizations',
    href: '/superadmin/organizations',
    icon: Building2,
    badgeKey: 'pendingOrgs',
  },
  {
    title: 'Space',
    href: '/superadmin/space',
    icon: Database,
    badgeKey: null,
  },
  {
    title: 'Recovery',
    href: '/superadmin/recovery',
    icon: RotateCcw,
    badgeKey: null,
  },
]

export function SuperAdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [pendingCount, setPendingCount] = useState<number>(0)

  // Fetch pending orgs count for live badge notification
  useEffect(() => {
    fetch('/api/superadmin/stats')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.organizations?.pending != null) {
          setPendingCount(Number(data.organizations.pending))
        }
      })
      .catch(() => {})
  }, [pathname])

  return (
    <div className="flex min-h-screen bg-slate-100/80 dark:bg-slate-900 font-sans">
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Navigation — Light Blue Theme */}
      <aside
        className={cn(
          'fixed top-0 bottom-0 left-0 z-50 flex w-72 flex-col border-r border-sky-200/80 bg-gradient-to-b from-sky-100/90 via-blue-50/90 to-indigo-50/70 text-slate-800 shadow-xl transition-transform duration-300 ease-in-out lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand Header */}
        <div className="flex h-20 items-center justify-between border-b border-sky-200/80 px-5 bg-white/50 backdrop-blur-sm">
          <Link href="/superadmin" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white p-1 shadow-md border border-blue-200/80 group-hover:scale-105 transition-transform duration-200 shrink-0">
              <img
                src="/logo.png"
                alt="Viros billing App Logo"
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-extrabold tracking-tight text-slate-900">
                  Viros billing App
                </span>
              </div>
              <p className="text-[11px] font-bold text-blue-600 tracking-wide uppercase">
                Administrator
              </p>
            </div>
          </Link>
          <button
            className="lg:hidden text-slate-500 hover:text-slate-900 p-1 rounded-md"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Flat Navigation Items List */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 custom-scrollbar">
          <ul className="space-y-1.5">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== '/superadmin' && pathname.startsWith(item.href))
              const badgeValue = item.badgeKey === 'pendingOrgs' ? pendingCount : 0

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'group relative flex items-center justify-between rounded-xl px-3.5 py-3 text-sm transition-all duration-200',
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-lg shadow-blue-500/25'
                        : 'text-slate-700 hover:bg-blue-100/70 hover:text-blue-900 hover:translate-x-1'
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-1">
                      <item.icon
                        className={cn(
                          'h-5 w-5 shrink-0 transition-transform group-hover:scale-110',
                          isActive ? 'text-white' : 'text-blue-600 group-hover:text-blue-700'
                        )}
                      />
                      <span className="text-sm font-medium leading-snug truncate">{item.title}</span>
                    </div>

                    {badgeValue > 0 && (
                      <span
                        className={cn(
                          'px-2 py-0.5 text-[10px] font-bold rounded-full shrink-0 animate-pulse',
                          isActive
                            ? 'bg-white text-blue-700 font-extrabold shadow-sm'
                            : 'bg-blue-600 text-white'
                        )}
                      >
                        {badgeValue} Pending
                      </span>
                    )}

                    {!isActive && badgeValue === 0 && (
                      <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 text-blue-500 transition-opacity" />
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Footer Actions */}
        <div className="border-t border-sky-200/80 p-4 space-y-2 bg-white/60 backdrop-blur-sm">
          {/* ERP Switch Button */}
          {session?.user?.organizationId && (
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-between border-blue-300 bg-white text-blue-700 hover:bg-blue-600 hover:text-white hover:border-blue-600 shadow-xs transition-all font-semibold text-xs h-9"
              onClick={() => router.push('/dashboard')}
            >
              <span className="flex items-center gap-2">
                <ExternalLink className="h-3.5 w-3.5" />
                Go to ERP Dashboard
              </span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}

          {/* Sign Out Button */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8"
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            <LogOut className="h-3.5 w-3.5 mr-2 text-rose-500" />
            Sign Out Platform
          </Button>
        </div>
      </aside>

      {/* Main Content View Container */}
      <div className="flex min-w-0 flex-1 flex-col lg:ml-72">
        {/* Sticky Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-blue-100 bg-white/95 backdrop-blur dark:bg-slate-950/95 dark:border-slate-800 px-4 sm:px-6 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden text-slate-600 hover:text-slate-900 dark:text-slate-300 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Platform Administration
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                Multi-tenant Management & Analytics Console
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* System Health Status Pill in Top Header Navbar */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-200 bg-white shadow-2xs text-xs font-semibold text-blue-950">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span>System Healthy</span>
              <Activity className="h-3.5 w-3.5 text-blue-600 ml-0.5" />
            </div>

            {/* Admin User Info Tag */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-200 bg-blue-50/80 text-xs text-blue-900 font-mono">
              <User className="h-3.5 w-3.5 text-blue-600" />
              <span>{session?.user?.email}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}
