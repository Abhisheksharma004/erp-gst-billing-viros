import { withAuth } from 'next-auth/middleware'
import { NextRequest, NextResponse } from 'next/server'
import { moduleFromPath } from '@/lib/permissions'

const AUTH_PAGES = [
  '/login',
  '/register',
  '/forgot-password',
  '/verify-otp',
  '/reset-password',
]

const SENSITIVE_QUERY_KEYS = [
  'password',
  'otp',
  'newPassword',
  'confirmPassword',
  'new_password',
  'confirm_password',
]

/** Redirect away from URLs that accidentally contain credentials (native GET form submit). */
function stripSensitiveAuthQuery(req: NextRequest): NextResponse | null {
  const path = req.nextUrl.pathname
  if (!AUTH_PAGES.includes(path)) return null

  const url = req.nextUrl.clone()
  let dirty = false

  for (const key of SENSITIVE_QUERY_KEYS) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key)
      dirty = true
    }
  }

  // If a password (or other secret) was present, also drop email from the URL
  if (dirty && url.searchParams.has('email')) {
    url.searchParams.delete('email')
  }

  if (!dirty) return null
  return NextResponse.redirect(url)
}

const protectedMiddleware = withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    if (path.startsWith('/superadmin')) {
      if (!token?.isSuperAdmin) {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
      return NextResponse.next()
    }

    const isOrgAdmin = token?.orgRole === 'OWNER' || token?.orgRole === 'ADMIN'

    if (path.startsWith('/profile')) {
      return NextResponse.next()
    }

    const adminOnlyPaths = ['/staff', '/roles', '/settings']
    if (adminOnlyPaths.some((p) => path.startsWith(p))) {
      if (!isOrgAdmin) {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
      return NextResponse.next()
    }

    if (!isOrgAdmin) {
      const module = moduleFromPath(path)
      if (module) {
        const permissions = (token?.permissions as string[]) || []
        const hasAccess =
          permissions.includes('*') || permissions.includes(`${module}:view`)
        if (!hasAccess) {
          const fallback = permissions.find((p) => p.endsWith(':view'))
          if (fallback) {
            const allowedModule = fallback.split(':')[0]
            const redirectMap: Record<string, string> = {
              dashboard: '/dashboard',
              inventory: '/inventory',
              billing: '/billing',
              purchases: '/purchases',
              customers: '/customers',
              vendors: '/vendors',
              quotations: '/quotations',
              'purchase-orders': '/purchase-orders',
              'delivery-challans': '/delivery-challans',
              'returnable-challans': '/returnable-challans',
              payments: '/payments',
              reports: '/reports',
            }
            const redirectTo = redirectMap[allowedModule] || '/login'
            return NextResponse.redirect(new URL(redirectTo, req.url))
          }
          return NextResponse.redirect(new URL('/login', req.url))
        }
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        if (req.nextUrl.pathname.startsWith('/superadmin')) {
          return Boolean(token?.isSuperAdmin)
        }
        return !!token
      },
    },
  }
)

export default function middleware(req: NextRequest) {
  const stripped = stripSensitiveAuthQuery(req)
  if (stripped) return stripped

  const path = req.nextUrl.pathname
  if (AUTH_PAGES.includes(path)) {
    return NextResponse.next()
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (protectedMiddleware as any)(req)
}

export const config = {
  matcher: [
    '/login',
    '/register',
    '/forgot-password',
    '/verify-otp',
    '/reset-password',
    '/superadmin/:path*',
    '/dashboard/:path*',
    '/inventory/:path*',
    '/billing/:path*',
    '/purchases/:path*',
    '/customers/:path*',
    '/vendors/:path*',
    '/quotations/:path*',
    '/purchase-orders/:path*',
    '/delivery-challans/:path*',
    '/returnable-challans/:path*',
    '/payments/:path*',
    '/reports/:path*',
    '/staff/:path*',
    '/roles/:path*',
    '/settings/:path*',
    '/profile/:path*',
  ],
}
