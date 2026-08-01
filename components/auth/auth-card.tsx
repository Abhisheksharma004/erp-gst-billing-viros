import Link from 'next/link'
import { Card } from '@/components/ui/card'

export const AUTH_CARD_CLASS =
  'border border-white/80 bg-white/95 shadow-2xl shadow-blue-900/15 backdrop-blur-md rounded-2xl overflow-hidden'

interface AuthCardProps {
  title: string
  subtitle?: string
  children: React.ReactNode
  className?: string
  showLogo?: boolean
}

export function AuthCard({
  title,
  subtitle,
  children,
  className,
  showLogo = true,
}: AuthCardProps) {
  return (
    <div className={className ? `w-full ${className}` : 'w-full max-w-md mx-auto px-1 sm:px-0'}>
      <Card className={AUTH_CARD_CLASS}>
        <div className="pt-6 sm:pt-8 px-6 pb-2 text-center flex flex-col items-center">
          {showLogo && (
            <Link href="/" className="group mb-3 inline-flex flex-col items-center">
              <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-white p-1.5 shadow-md ring-2 ring-blue-600/20 transition-transform group-hover:scale-105">
                <img
                  src="/logo.png"
                  alt="Viros GST Billing Logo"
                  className="h-full w-full object-contain"
                />
              </div>
              <span className="mt-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-blue-600 transition-colors">
                Viros GST Billing
              </span>
            </Link>
          )}
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-slate-600 font-medium">{subtitle}</p>
          )}
        </div>

        {children}

        <div className="border-t border-slate-100 bg-slate-50/80 px-6 py-4 text-center text-xs font-medium text-slate-500">
          &copy; {new Date().getFullYear()} Viros Entrepreneurs IT Solutions Pvt. Ltd. All rights reserved.
        </div>
      </Card>
    </div>
  )
}

