'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  FileText,
  Package,
  BarChart3,
  ShieldCheck,
  Users,
  Menu,
  X,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Mail,
  Phone,
  Globe,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AuthLightMode } from '@/components/auth/auth-light-mode'
import { RegisterSlidePanel } from '@/components/landing/register-slide-panel'

const APP_NAME = 'Viros GST Billing'

const features = [
  {
    icon: FileText,
    title: 'GST Invoicing',
    description: 'Create tax-compliant invoices, quotations, and delivery challans in minutes.',
    accent: 'from-blue-500 to-blue-700',
    iconBg: 'bg-blue-600 shadow-blue-600/30',
    bar: 'from-blue-400 via-blue-500 to-blue-600',
    hoverBorder: 'hover:border-blue-200/80',
    hoverShadow: 'hover:shadow-blue-500/15',
  },
  {
    icon: Package,
    title: 'Inventory & Purchases',
    description: 'Track stock, manage vendors, and handle purchase orders from one dashboard.',
    accent: 'from-violet-500 to-violet-700',
    iconBg: 'bg-violet-600 shadow-violet-600/30',
    bar: 'from-violet-400 via-violet-500 to-violet-600',
    hoverBorder: 'hover:border-violet-200/80',
    hoverShadow: 'hover:shadow-violet-500/15',
  },
  {
    icon: BarChart3,
    title: 'Reports & Analytics',
    description: 'Get clear insights into sales, purchases, and GST summaries for smarter decisions.',
    accent: 'from-emerald-500 to-emerald-700',
    iconBg: 'bg-emerald-600 shadow-emerald-600/30',
    bar: 'from-emerald-400 via-emerald-500 to-emerald-600',
    hoverBorder: 'hover:border-emerald-200/80',
    hoverShadow: 'hover:shadow-emerald-500/15',
  },
  {
    icon: Users,
    title: 'Team & Roles',
    description: 'Assign permissions to staff so everyone sees only what they need.',
    accent: 'from-amber-500 to-amber-700',
    iconBg: 'bg-amber-500 shadow-amber-500/30',
    bar: 'from-amber-400 via-amber-500 to-amber-600',
    hoverBorder: 'hover:border-amber-200/80',
    hoverShadow: 'hover:shadow-amber-500/15',
  },
  {
    icon: ShieldCheck,
    title: 'Built for Compliance',
    description: 'Designed for Indian GST workflows — accurate, organised, and audit-ready.',
    accent: 'from-cyan-500 to-cyan-700',
    iconBg: 'bg-cyan-600 shadow-cyan-600/30',
    bar: 'from-cyan-400 via-cyan-500 to-cyan-600',
    hoverBorder: 'hover:border-cyan-200/80',
    hoverShadow: 'hover:shadow-cyan-500/15',
  },
]

export function WelcomePage() {
  const [registerOpen, setRegisterOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <>
      <AuthLightMode />
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-200 via-blue-300 to-indigo-400">
        {/* Navigation Bar */}
        <header className="sticky top-0 z-40 w-full border-b border-white/40 bg-white/75 backdrop-blur-md shadow-sm transition-all duration-200">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
            {/* Brand Logo & Name */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-white p-1 shadow-md ring-1 ring-slate-900/10 transition-transform group-hover:scale-105">
                <img
                  src="/logo.png"
                  alt="Viros Entrepreneurs Logo"
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 transition-colors group-hover:text-blue-600">
                  Viros <span className="text-blue-600">GST Billing</span>
                </span>
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest -mt-1">
                  Viros Entrepreneurs IT Solutions
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-700">
              <a
                href="#features"
                className="transition-colors hover:text-blue-600 font-semibold"
              >
                Features
              </a>
              <a
                href="#why-viros"
                className="transition-colors hover:text-blue-600 font-semibold"
              >
                Why Viros
              </a>
              <a
                href="#compliance"
                className="transition-colors hover:text-blue-600 font-semibold"
              >
                GST Compliance
              </a>
            </nav>

            {/* Right Action Buttons */}
            <div className="hidden md:flex items-center gap-3">
              <Button
                variant="ghost"
                asChild
                className="text-slate-700 hover:text-blue-600 hover:bg-blue-50/80 font-semibold"
              >
                <Link href="/login">Sign In</Link>
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/25 transition-all hover:shadow-lg hover:shadow-blue-600/35"
                onClick={() => setRegisterOpen(true)}
              >
                Get Started Free
              </Button>
            </div>

            {/* Mobile Hamburger Button */}
            <div className="flex md:hidden items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle navigation menu"
                className="text-slate-800 hover:bg-slate-100/50"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>

          {/* Mobile Navigation Menu Dropdown */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-slate-200/60 bg-white/95 backdrop-blur-lg px-4 pt-3 pb-6 shadow-xl animate-in slide-in-from-top duration-200">
              <div className="flex flex-col space-y-3 font-medium text-slate-700">
                <a
                  href="#features"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors"
                >
                  Features
                </a>
                <a
                  href="#why-viros"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors"
                >
                  Why Viros
                </a>
                <a
                  href="#compliance"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors"
                >
                  GST Compliance
                </a>
                <div className="pt-3 border-t border-slate-200 flex flex-col gap-2">
                  <Button
                    variant="outline"
                    asChild
                    className="w-full justify-center bg-slate-50 border-slate-300 font-semibold"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Link href="/login">Sign In</Link>
                  </Button>
                  <Button
                    className="w-full justify-center bg-blue-600 hover:bg-blue-700 font-semibold shadow-md shadow-blue-600/20"
                    onClick={() => {
                      setMobileMenuOpen(false)
                      setRegisterOpen(true)
                    }}
                  >
                    Get Started Free
                  </Button>
                </div>
              </div>
            </div>
          )}
        </header>

        {/* Hero & Features Main Content */}
        <main className="flex-1">
          <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <div className="mx-auto max-w-3xl text-center">
              <div className="inline-flex items-center gap-2 mb-4 rounded-full bg-blue-600/10 px-3 py-1 text-xs sm:text-sm font-semibold uppercase tracking-wider text-blue-900 ring-1 ring-blue-600/20 shadow-sm backdrop-blur-sm">
                <Sparkles className="h-4 w-4 text-blue-700" />
                Complete GST ERP for Indian Businesses
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                Transform Your Daily <span className="text-blue-700">Billing Workflow</span>
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-slate-700 sm:text-xl">
                Stop juggling spreadsheets and manual entries. {APP_NAME} brings
                invoicing, inventory, purchases, and GST reporting together — so you can bill
                faster, stay compliant, and focus on growing your business.
              </p>
              <div className="mx-auto mt-10 flex w-full max-w-md flex-row items-stretch justify-center gap-3 sm:max-w-lg">
                <Button
                  size="lg"
                  className="h-12 flex-1 px-4 text-base bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02]"
                  onClick={() => setRegisterOpen(true)}
                >
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="h-12 flex-1 bg-white/70 border-slate-300 px-4 text-base font-semibold hover:bg-white text-slate-800 shadow-sm backdrop-blur-sm"
                >
                  <Link href="/login">Sign In</Link>
                </Button>
              </div>

              {/* Trust Badges */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs sm:text-sm text-slate-700 font-medium">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>100% Tax Compliant</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Instant Setup</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Secure & Reliable</span>
                </div>
              </div>
            </div>

            {/* Features Grid Section */}
            <div id="features" className="mt-16 grid grid-cols-1 gap-6 sm:mt-20 sm:grid-cols-2 lg:mt-24 lg:grid-cols-3 scroll-mt-24">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className={`group relative overflow-hidden rounded-2xl border border-white/70 bg-white/90 p-5 shadow-md shadow-slate-900/5 backdrop-blur-md transition-all duration-300 hover:-translate-y-1.5 hover:bg-white hover:shadow-xl sm:p-6 ${feature.hoverBorder} ${feature.hoverShadow}`}
                >
                  <div
                    className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${feature.bar} opacity-80 transition-opacity group-hover:opacity-100`}
                  />
                  <div
                    className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${feature.accent} opacity-[0.07] blur-2xl transition-opacity group-hover:opacity-[0.14]`}
                  />

                  <div className="relative flex items-start gap-4">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${feature.iconBg} text-white shadow-lg transition-transform duration-300 group-hover:scale-110`}
                    >
                      <feature.icon className="h-5 w-5" strokeWidth={2.25} />
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <h3 className="text-base font-semibold leading-snug text-slate-900 sm:text-lg">
                        {feature.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>

        {/* Rich Effective Footer */}
        <footer className="border-t border-white/40 bg-white/80 backdrop-blur-lg pt-12 pb-8 text-slate-700 shadow-inner">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pb-10 border-b border-slate-200/80">
              {/* Column 1: Company Info */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white p-1 shadow-md ring-1 ring-slate-900/10">
                    <img
                      src="/logo.png"
                      alt="Viros Entrepreneurs Logo"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 leading-tight">Viros GST Billing</h3>
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      IT Solutions Pvt Ltd
                    </p>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-slate-600">
                  Complete GST ERP & Invoicing solution for Indian businesses. Streamline billing, inventory management, purchase tracking, and tax compliance effortlessly.
                </p>
              </div>

              {/* Column 2: Quick Links */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                  Quick Links
                </h4>
                <ul className="space-y-2 text-sm font-medium">
                  <li>
                    <a href="#features" className="hover:text-blue-600 transition-colors inline-flex items-center gap-1">
                      Features & Modules
                    </a>
                  </li>
                  <li>
                    <a href="#why-viros" className="hover:text-blue-600 transition-colors inline-flex items-center gap-1">
                      Why Choose Viros
                    </a>
                  </li>
                  <li>
                    <a href="#compliance" className="hover:text-blue-600 transition-colors inline-flex items-center gap-1">
                      GST Compliance
                    </a>
                  </li>
                  <li>
                    <Link href="/privacy-policy" className="hover:text-blue-600 transition-colors inline-flex items-center gap-1">
                      Privacy Policy
                    </Link>
                  </li>
                  <li>
                    <Link href="/login" className="hover:text-blue-600 transition-colors inline-flex items-center gap-1">
                      Sign In Account
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Column 3: Solutions */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                  Solutions
                </h4>
                <ul className="space-y-2 text-sm font-medium text-slate-600">
                  <li>GST Compliant Invoicing</li>
                  <li>Real-time Inventory Tracking</li>
                  <li>Purchase Order & Vendor Management</li>
                  <li>Automated GST Summary Reports</li>
                  <li>Role-based Access & Security</li>
                </ul>
              </div>

              {/* Column 4: Contact Us */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                  Contact Us
                </h4>
                <ul className="space-y-3 text-sm font-medium">
                  <li>
                    <a
                      href="mailto:Sales@virosentrepreneurs.com"
                      className="group flex items-center gap-2.5 text-slate-700 hover:text-blue-600 transition-colors"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <Mail className="h-4 w-4" />
                      </div>
                      <span className="break-all font-semibold">Sales@virosentrepreneurs.com</span>
                    </a>
                  </li>
                  <li>
                    <a
                      href="tel:+918377929141"
                      className="group flex items-center gap-2.5 text-slate-700 hover:text-blue-600 transition-colors"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <Phone className="h-4 w-4" />
                      </div>
                      <span className="font-semibold">+91 8377929141</span>
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://www.virosentrepreneurs.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-2.5 text-slate-700 hover:text-blue-600 transition-colors"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <Globe className="h-4 w-4" />
                      </div>
                      <span className="font-semibold">www.virosentrepreneurs.com</span>
                      <ExternalLink className="h-3 w-3 opacity-60 group-hover:opacity-100" />
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            {/* Bottom Copyright & Rights */}
            <div className="pt-6 text-center text-xs sm:text-sm font-semibold text-slate-600">
              &copy; {new Date().getFullYear()} Viros Entrepreneurs IT Solutions Pvt. Ltd. All rights reserved.
            </div>
          </div>
        </footer>
      </div>

      <RegisterSlidePanel open={registerOpen} onOpenChange={setRegisterOpen} />
    </>
  )
}

