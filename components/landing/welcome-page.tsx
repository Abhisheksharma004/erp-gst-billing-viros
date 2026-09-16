'use client'

import { useState, useEffect, useRef } from 'react'
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
  Star,
  Play,
  TrendingUp,
  Receipt,
  Building2,
  Clock,
  Layers,
  Award,
  ChevronDown,
  Printer,
  Radio,
  Cloud,
  Check,
  Download,
  Share2,
  AlertTriangle,
  CreditCard,
  Lock,
  Smartphone,
  PieChart,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AuthLightMode } from '@/components/auth/auth-light-mode'
import { RegisterSlidePanel } from '@/components/landing/register-slide-panel'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

const APP_NAME = 'Viros GST Billing'

// --- Smooth Animated Number Counter Component ---
function AnimatedCounter({
  end,
  duration = 2000,
  prefix = '',
  suffix = '',
  decimals = 0,
}: {
  end: number
  duration?: number
  prefix?: string
  suffix?: string
  decimals?: number
}) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const [hasAnimated, setHasAnimated] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated) {
          setHasAnimated(true)
          let startTimestamp: number | null = null
          const step = (timestamp: number) => {
            if (!startTimestamp) startTimestamp = timestamp
            const progress = Math.min((timestamp - startTimestamp) / duration, 1)
            // Ease out cubic calculation
            const easeOut = 1 - Math.pow(1 - progress, 3)
            setCount(easeOut * end)
            if (progress < 1) {
              window.requestAnimationFrame(step)
            } else {
              setCount(end)
            }
          }
          window.requestAnimationFrame(step)
        }
      },
      { threshold: 0.2 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [end, duration, hasAnimated])

  return (
    <span ref={ref} className="tabular-nums font-extrabold tracking-tight">
      {prefix}
      {decimals > 0 ? count.toFixed(decimals) : Math.floor(count).toLocaleString('en-IN')}
      {suffix}
    </span>
  )
}

const testimonials = [
  {
    name: 'Rajesh Sharma',
    role: 'Managing Director',
    company: 'Sharma Electricals & Hardware',
    city: 'Delhi NCR',
    rating: 5,
    avatar: 'RS',
    comment:
      'Viros GST Billing completely transformed our counter billing speed. Our staff learned it in 15 minutes, and 1-click GSTR-1 filing saves our CA more than 15 hours every month.',
    highlight: 'Saved 15+ hours/month',
  },
  {
    name: 'Pooja Mehta',
    role: 'Finance Head',
    company: 'Mehta Textile Mills',
    city: 'Surat, Gujarat',
    rating: 5,
    avatar: 'PM',
    comment:
      'We handle hundreds of purchase bills and delivery challans daily. The auto-inventory update and same-product multiple line items feature made our workflow 10x smoother.',
    highlight: '10x smoother inventory',
  },
  {
    name: 'Vikramjit Singh',
    role: 'Founder & CEO',
    company: 'Apex Agro & Equipment Corp',
    city: 'Ludhiana, Punjab',
    rating: 5,
    avatar: 'VS',
    comment:
      'The ability to share invoices directly on WhatsApp as PDF and track payments in real time brought down our overdue customer collections by 40%. Highly recommended!',
    highlight: 'Overdue reduced by 40%',
  },
  {
    name: 'Karthik Raman',
    role: 'Operations Lead',
    company: 'Sri Balaji Wholesale Dist.',
    city: 'Bengaluru, Karnataka',
    rating: 5,
    avatar: 'KR',
    comment:
      'Accurate tax split between CGST/SGST and IGST is automatic. We do not have to double-check calculation errors anymore. Truly the best software for Indian SME businesses.',
    highlight: 'Zero tax calculation errors',
  },
]

const faqs = [
  {
    q: 'Is Viros GST Billing suitable for retail counters as well as wholesale?',
    a: 'Yes! Viros supports fast retail POS billing with barcode scanner support and thermal printing, as well as complex wholesale invoices with credit terms, custom discounts, and transporter details.',
  },
  {
    q: 'Can I add the same product on multiple lines in an invoice?',
    a: 'Yes! You can add the same product multiple times across different line items with custom quantities, batch details, or different rates without any duplicate restriction.',
  },
  {
    q: 'Can I export reports for my CA or GST filing?',
    a: 'Absolutely. You can generate and export complete GSTR-1, GSTR-3B summaries, monthly sales/purchase reports, and ledger statements in Excel and PDF formats with a single click.',
  },
  {
    q: 'Is my business and financial data secure?',
    a: 'Yes. All data is protected with enterprise-grade encrypted connections, daily automatic database backups, and role-based access control so your staff only sees what they are permitted to.',
  },
  {
    q: 'Can I use it on multiple devices or branches?',
    a: 'Yes, Viros is cloud-accessible. You can log in securely from your PC, laptop, or mobile browser from anywhere, anytime.',
  },
]

export function WelcomePage() {
  const [registerOpen, setRegisterOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [demoModalOpen, setDemoModalOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  return (
    <>
      <AuthLightMode />
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-blue-600 selection:text-white">
        {/* Navigation Bar */}
        <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md shadow-xs transition-all">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
            {/* Brand Logo & Name */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-900/10 transition-transform group-hover:scale-105">
                <img
                  src="/logo.png"
                  alt="Viros Logo"
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 transition-colors group-hover:text-blue-600">
                  Viros <span className="text-blue-600">GST Billing</span>
                </span>
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest -mt-1">
                  Viros Entrepreneurs IT Solutions
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center space-x-8 text-sm font-semibold text-slate-700">
              <a href="#features" className="transition-colors hover:text-blue-600">
                Features & Modules
              </a>
              <a href="#stats" className="transition-colors hover:text-blue-600">
                Impact & Growth
              </a>
              <a href="#testimonials" className="transition-colors hover:text-blue-600">
                Reviews
              </a>
              <a href="#faq" className="transition-colors hover:text-blue-600">
                FAQ
              </a>
            </nav>

            {/* Right Action Buttons */}
            <div className="hidden md:flex items-center gap-3">
              <Button
                variant="ghost"
                asChild
                className="text-slate-700 hover:text-blue-600 hover:bg-blue-50 font-semibold"
              >
                <Link href="/login">Sign In</Link>
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/25 transition-all hover:shadow-lg hover:shadow-blue-600/35 font-semibold px-5"
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
                className="text-slate-800 hover:bg-slate-100"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>

          {/* Mobile Navigation Menu Dropdown */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 shadow-xl animate-in slide-in-from-top duration-200">
              <div className="flex flex-col space-y-3 font-semibold text-slate-700">
                <a
                  href="#features"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors"
                >
                  Features & Modules
                </a>
                <a
                  href="#stats"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors"
                >
                  Impact & Growth
                </a>
                <a
                  href="#testimonials"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors"
                >
                  Reviews
                </a>
                <a
                  href="#faq"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors"
                >
                  FAQ
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
                    className="w-full justify-center bg-blue-600 hover:bg-blue-700 font-semibold text-white shadow-md shadow-blue-600/20"
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

        {/* HERO SECTION */}
        <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/70 via-indigo-50/40 to-slate-50 pt-12 pb-20 lg:pt-16 lg:pb-28">
          <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.15] pointer-events-none" />

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Left Column: Hero Copy & CTA */}
              <div className="lg:col-span-6 space-y-6 text-left">
                <div className="inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-3.5 py-1.5 text-xs sm:text-sm font-bold tracking-wide text-blue-800 ring-1 ring-blue-600/20 shadow-xs backdrop-blur-sm">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  Complete GST ERP for Indian Businesses
                </div>

                <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl leading-[1.12]">
                  Transform Your Business with{' '}
                  <span className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 bg-clip-text text-transparent">
                    Smart Billing & ERP
                  </span>
                </h1>

                <p className="text-base sm:text-lg leading-relaxed text-slate-600 max-w-xl">
                  {APP_NAME} helps you manage invoicing, inventory, purchases, and GST reporting — all in one place. Simple, fast and reliable.
                </p>

                {/* Trust Badges */}
                <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs sm:text-sm text-slate-700 font-semibold pt-1">
                  <div className="flex items-center gap-1.5 bg-white/80 px-2.5 py-1 rounded-full border border-slate-200/80 shadow-2xs">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>100% Tax Compliant</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white/80 px-2.5 py-1 rounded-full border border-slate-200/80 shadow-2xs">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Instant Setup</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white/80 px-2.5 py-1 rounded-full border border-slate-200/80 shadow-2xs">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Secure & Reliable</span>
                  </div>
                </div>

                {/* Primary CTA Buttons */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                  <Button
                    size="lg"
                    className="h-12 px-6 text-base bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02] font-semibold"
                    onClick={() => setRegisterOpen(true)}
                  >
                    Get Started Free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-12 px-6 text-base bg-white border-slate-300 font-semibold text-slate-800 hover:bg-slate-50 shadow-xs"
                    onClick={() => setDemoModalOpen(true)}
                  >
                    <Play className="mr-2 h-4 w-4 fill-blue-600 text-blue-600" />
                    Watch Demo
                  </Button>
                </div>

                <p className="text-xs text-slate-500 font-medium pt-1">
                  No credit card required &bull; Start in minutes &bull; Free onboarding support
                </p>
              </div>

              {/* Right Column: High-Fidelity ERP Mockup Card & Phone Visual */}
              <div className="lg:col-span-6 relative">
                {/* Glow Backdrop */}
                <div className="absolute -inset-2 bg-gradient-to-tr from-blue-500/20 via-indigo-500/20 to-purple-500/10 rounded-3xl blur-2xl pointer-events-none" />

                {/* Main Desktop Dashboard Preview */}
                <div className="relative rounded-2xl border border-slate-200/90 bg-white p-3 sm:p-4 shadow-2xl shadow-blue-900/10">
                  {/* Window Bar */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3 px-1">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-red-400" />
                      <div className="h-3 w-3 rounded-full bg-amber-400" />
                      <div className="h-3 w-3 rounded-full bg-emerald-400" />
                      <span className="ml-2 text-xs font-semibold text-slate-500">app.virosbilling.com</span>
                    </div>
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                      <Check className="h-3 w-3" /> Auto GST Calculation
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-3">
                    {/* Mini Sidebar */}
                    <div className="col-span-3 bg-slate-900 text-white rounded-xl p-3 hidden sm:flex flex-col justify-between text-xs space-y-4">
                      <div>
                        <div className="flex items-center gap-2 font-bold pb-3 border-b border-slate-800 text-blue-400">
                          <Receipt className="h-4 w-4" /> Viros ERP
                        </div>
                        <ul className="space-y-1.5 mt-3 text-slate-300 font-medium">
                          <li className="bg-blue-600 text-white px-2 py-1.5 rounded-md font-semibold">Dashboard</li>
                          <li className="px-2 py-1.5 hover:text-white cursor-pointer">Sales & Invoices</li>
                          <li className="px-2 py-1.5 hover:text-white cursor-pointer">Purchases</li>
                          <li className="px-2 py-1.5 hover:text-white cursor-pointer">Inventory</li>
                          <li className="px-2 py-1.5 hover:text-white cursor-pointer">GST Reports</li>
                        </ul>
                      </div>
                      <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400">
                        Active Org: <span className="text-white font-semibold">Viros Tech</span>
                      </div>
                    </div>

                    {/* Dashboard Screen */}
                    <div className="col-span-12 sm:col-span-9 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">Dashboard Overview</h4>
                          <p className="text-[11px] text-slate-500">Here's your real-time tax & sales report today</p>
                        </div>
                        <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-100">
                          Live Active
                        </span>
                      </div>

                      {/* Stat Tiles */}
                      <div className="grid grid-cols-3 gap-2 text-left">
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                          <p className="text-[10px] font-semibold text-slate-500">Total Sales</p>
                          <p className="text-xs sm:text-sm font-extrabold text-slate-900">₹ 2,45,680</p>
                          <p className="text-[9px] font-bold text-emerald-600 flex items-center gap-0.5">
                            <TrendingUp className="h-2.5 w-2.5" /> +12% MoM
                          </p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                          <p className="text-[10px] font-semibold text-slate-500">Purchases</p>
                          <p className="text-xs sm:text-sm font-extrabold text-slate-900">₹ 1,32,450</p>
                          <p className="text-[9px] font-bold text-blue-600">+8% stock</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                          <p className="text-[10px] font-semibold text-slate-500">Stock Value</p>
                          <p className="text-xs sm:text-sm font-extrabold text-slate-900">₹ 3,21,750</p>
                          <p className="text-[9px] font-bold text-emerald-600">Audit Ready</p>
                        </div>
                      </div>

                      {/* Wave Chart Graphic Simulation */}
                      <div className="rounded-xl border border-slate-200/80 bg-gradient-to-b from-blue-50/50 to-white p-3 space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                          <span>Monthly Taxable Turnover</span>
                          <span className="text-blue-600 font-bold">₹ 18.4 Lakhs</span>
                        </div>
                        <div className="h-14 w-full flex items-end gap-1.5 pt-2">
                          {[35, 45, 30, 60, 55, 75, 68, 85, 92, 78, 95, 100].map((h, idx) => (
                            <div
                              key={idx}
                              className="flex-1 bg-gradient-to-t from-blue-600 to-indigo-400 rounded-t-sm transition-all duration-300 hover:opacity-80"
                              style={{ height: `${h}%` }}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Items Row */}
                      <div className="flex items-center justify-between text-[11px] bg-slate-50 p-2 rounded-lg border border-slate-200/70 text-slate-700">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          <span className="font-semibold">Helical Gear Box &bull; HSN 8483</span>
                        </div>
                        <span className="font-bold text-slate-900">₹ 18,500 (18% GST)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating Mobile Bill Mockup (Overlapping Bottom Right) */}
                <div className="absolute -bottom-6 -right-2 sm:-right-4 w-48 sm:w-56 rounded-2xl bg-white p-3 border border-slate-200/90 shadow-2xl shadow-blue-900/20 text-left hidden xs:block">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500">INVOICE</p>
                      <p className="text-xs font-extrabold text-blue-600">#INV-2026-09</p>
                    </div>
                    <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
                      PAID
                    </span>
                  </div>
                  <div className="space-y-1 text-[11px] text-slate-600">
                    <div className="flex justify-between">
                      <span>Taxable:</span>
                      <span className="font-semibold text-slate-900">₹ 24,500</span>
                    </div>
                    <div className="flex justify-between">
                      <span>GST (18%):</span>
                      <span className="font-semibold text-slate-900">₹ 4,410</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-100">
                      <span>Grand Total:</span>
                      <span className="text-blue-600">₹ 28,910</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setRegisterOpen(true)}
                    className="mt-2.5 w-full rounded-md bg-blue-600 py-1 text-[10px] font-bold text-white shadow-xs hover:bg-blue-700 flex items-center justify-center gap-1"
                  >
                    <span>Download PDF Invoice</span>
                  </button>
                </div>

                {/* Floating Bottom Feature Pills */}
                <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs font-semibold text-slate-700">
                  <span className="inline-flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-2xs">
                    <Printer className="h-3.5 w-3.5 text-blue-600" /> Barcode & Label Printing
                  </span>
                  <span className="inline-flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-2xs">
                    <Radio className="h-3.5 w-3.5 text-indigo-600" /> RFID Solutions
                  </span>
                  <span className="inline-flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-2xs">
                    <Cloud className="h-3.5 w-3.5 text-purple-600" /> Cloud & On-Premise
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* STATS & IMPACT SECTION (WITH ANIMATED NUMBERS) */}
        {/* ========================================================================= */}
        <section id="stats" className="relative z-10 -mt-8 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 sm:p-10 shadow-xl shadow-slate-900/5 backdrop-blur-xl">
            <div className="text-center max-w-2xl mx-auto mb-8">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                Proven Track Record
              </span>
              <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900">
                Trusted by Fast-Growing Businesses Across India
              </h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center divide-y md:divide-y-0 md:divide-x divide-slate-100">
              {/* Stat 1: Active Users */}
              <div className="pt-4 md:pt-0 px-2 sm:px-4">
                <div className="flex items-center justify-center gap-1 text-3xl sm:text-4xl lg:text-5xl font-black text-blue-600">
                  <AnimatedCounter end={15000} suffix="+" />
                </div>
                <p className="mt-2 text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Active Businesses
                </p>
                <p className="text-xs text-slate-500 font-medium">Retailers, Wholesalers & MSMEs</p>
              </div>

              {/* Stat 2: Invoiced Volume */}
              <div className="pt-4 md:pt-0 px-2 sm:px-4">
                <div className="flex items-center justify-center gap-1 text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900">
                  <AnimatedCounter end={350} prefix="₹" suffix=" Cr+" />
                </div>
                <p className="mt-2 text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Invoices Processed
                </p>
                <p className="text-xs text-slate-500 font-medium">Generated safely on Viros ERP</p>
              </div>

              {/* Stat 3: Tax Compliance Rate */}
              <div className="pt-4 md:pt-0 px-2 sm:px-4">
                <div className="flex items-center justify-center gap-1 text-3xl sm:text-4xl lg:text-5xl font-black text-emerald-600">
                  <AnimatedCounter end={99} decimals={1} suffix="%" />
                </div>
                <p className="mt-2 text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Audit Accuracy
                </p>
                <p className="text-xs text-slate-500 font-medium">100% Tax Compliant GST Engine</p>
              </div>

              {/* Stat 4: Customer Satisfaction / Feedback */}
              <div className="pt-4 md:pt-0 px-2 sm:px-4">
                <div className="flex items-center justify-center gap-1 text-3xl sm:text-4xl lg:text-5xl font-black text-amber-500">
                  <AnimatedCounter end={4} decimals={1} suffix=" ★" />
                </div>
                <p className="mt-2 text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide">
                  User Rating
                </p>
                <p className="text-xs text-slate-500 font-medium">Based on 3,200+ Verified Reviews</p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* ALTERNATING LEFT / RIGHT SOFTWARE FEATURES SECTION */}
        {/* ========================================================================= */}
        <section id="features" className="py-24 bg-white border-t border-slate-200/80 scroll-mt-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-28">
            <div className="text-center max-w-3xl mx-auto">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3.5 py-1.5 rounded-full border border-blue-100">
                Powerful Modules Built for Growth
              </span>
              <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
                Designed to Handle Every Aspect of Your Trade
              </h2>
              <p className="mt-4 text-base sm:text-lg text-slate-600">
                From fast retail POS counters to complex multi-batch manufacturing & distribution, see how Viros streamlines operations.
              </p>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* FEATURE 1: Left Copy | Right Visual Card */}
            {/* ------------------------------------------------------------- */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-6 space-y-5 text-left">
                <div className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-200/70">
                  <FileText className="h-4 w-4 text-blue-600" />
                  Fast & Compliant Billing
                </div>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
                  Generate GST Tax Invoices & Quotations in Seconds
                </h3>
                <p className="text-base text-slate-600 leading-relaxed">
                  Create professional, audit-ready invoices, proforma bills, quotations, and delivery challans. Automatic state detection applies intra-state (CGST + SGST) or inter-state (IGST) accurately without manual effort.
                </p>
                <ul className="space-y-3 pt-2">
                  <li className="flex items-start gap-3 text-sm font-medium text-slate-700">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Repeat Product Lines Supported:</strong> Add the same product multiple times across lines with unique rates, batches, or descriptions.</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm font-medium text-slate-700">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Multi-Format Print:</strong> Direct printing to thermal receipt printers (2-inch, 3-inch) or full standard A4/A5 tax invoices.</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm font-medium text-slate-700">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>1-Click WhatsApp & Email:</strong> Send clean PDF invoices directly to your clients with instant payment QR codes.</span>
                  </li>
                </ul>
              </div>

              {/* Visual Card 1 */}
              <div className="lg:col-span-6">
                <div className="rounded-3xl border border-slate-200/90 bg-gradient-to-br from-slate-50 via-white to-blue-50/40 p-6 sm:p-8 shadow-xl shadow-slate-900/5 text-left relative overflow-hidden">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">TAX INVOICE PREVIEW</span>
                      <h4 className="text-lg font-black text-slate-900">#INV-2026-0042</h4>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-extrabold text-emerald-700 border border-emerald-300">
                      PAID IN FULL
                    </span>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 mb-4 shadow-2xs text-xs">
                    <div className="flex justify-between pb-2 border-b border-slate-100">
                      <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Billed To (Customer)</p>
                        <p className="font-extrabold text-slate-900 text-sm">ABC Tech Enterprises</p>
                        <p className="text-slate-500 font-mono text-[11px]">GSTIN: 29AABCU9603R1Z2</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Place of Supply</p>
                        <p className="font-bold text-slate-800">Karnataka (29)</p>
                        <span className="inline-block bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold mt-1">
                          Intra-State (CGST + SGST)
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-slate-700 font-semibold bg-slate-50 p-2 rounded-lg">
                        <div>
                          <p className="font-bold text-slate-900">1. Helical Gear Box (Batch #A1)</p>
                          <p className="text-[10px] text-slate-500">Qty: 2 &bull; Rate: ₹ 9,250 &bull; GST: 18%</p>
                        </div>
                        <span className="font-bold text-slate-900">₹ 18,500</span>
                      </div>

                      <div className="flex justify-between items-center text-slate-700 font-semibold bg-slate-50 p-2 rounded-lg">
                        <div>
                          <p className="font-bold text-slate-900">2. Helical Gear Box (Custom Mount)</p>
                          <p className="text-[10px] text-slate-500">Qty: 1 &bull; Rate: ₹ 6,000 &bull; GST: 18%</p>
                        </div>
                        <span className="font-bold text-slate-900">₹ 6,000</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 space-y-1 text-slate-600 font-medium">
                      <div className="flex justify-between">
                        <span>Taxable Value:</span>
                        <span className="font-bold text-slate-900">₹ 24,500.00</span>
                      </div>
                      <div className="flex justify-between text-blue-700 font-semibold">
                        <span>Central GST (CGST 9%):</span>
                        <span>₹ 2,205.00</span>
                      </div>
                      <div className="flex justify-between text-blue-700 font-semibold">
                        <span>State GST (SGST 9%):</span>
                        <span>₹ 2,205.00</span>
                      </div>
                      <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-200">
                        <span>Grand Invoice Total:</span>
                        <span className="text-blue-600">₹ 28,910.00</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setRegisterOpen(true)}
                      className="flex-1 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-xs"
                    >
                      <Download className="h-3.5 w-3.5" /> Download Tax Invoice PDF
                    </button>
                    <button
                      onClick={() => setRegisterOpen(true)}
                      className="rounded-xl bg-emerald-600 text-white px-3.5 py-2.5 text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center gap-1.5"
                    >
                      <Share2 className="h-3.5 w-3.5" /> WhatsApp
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* FEATURE 2: Left Visual Card | Right Copy */}
            {/* ------------------------------------------------------------- */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Visual Card 2 (Left on Desktop) */}
              <div className="lg:col-span-6 order-2 lg:order-1">
                <div className="rounded-3xl border border-slate-200/90 bg-gradient-to-bl from-slate-50 via-white to-indigo-50/40 p-6 sm:p-8 shadow-xl shadow-slate-900/5 text-left">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
                        <Package className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-base font-extrabold text-slate-900">Inventory Health Monitor</h4>
                        <p className="text-xs text-slate-500">Live warehouse stock updates</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                      Real-Time Sync
                    </span>
                  </div>

                  <div className="space-y-3">
                    {/* Item 1: High Stock */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-3.5 flex items-center justify-between shadow-2xs">
                      <div>
                        <p className="text-sm font-bold text-slate-900">Motor Mount Flange 50mm</p>
                        <p className="text-xs text-slate-500">SKU: MM-50 &bull; HSN: 8483</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-slate-900">142 Units</span>
                        <p className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 justify-end">
                          <Check className="h-3 w-3" /> Sufficient Stock
                        </p>
                      </div>
                    </div>

                    {/* Item 2: Low Stock Warning */}
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-3.5 flex items-center justify-between shadow-2xs">
                      <div>
                        <p className="text-sm font-bold text-slate-900">Helical Gear Box Series 4</p>
                        <p className="text-xs text-slate-500">SKU: HGB-4 &bull; HSN: 8483</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-amber-700">3 Units</span>
                        <p className="text-[10px] font-bold text-amber-700 flex items-center gap-1 justify-end">
                          <AlertTriangle className="h-3 w-3" /> Low Stock Alert (&le; 5)
                        </p>
                      </div>
                    </div>

                    {/* Item 3: Out of stock */}
                    <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-3.5 flex items-center justify-between shadow-2xs">
                      <div>
                        <p className="text-sm font-bold text-slate-900">RFID Scanner Smart Tags</p>
                        <p className="text-xs text-slate-500">SKU: RFID-TG &bull; HSN: 8523</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-rose-700">0 Units</span>
                        <p className="text-[10px] font-bold text-rose-700">Out of Stock</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl bg-slate-100 p-3 text-xs text-slate-600 font-medium flex items-center justify-between">
                    <span>Audit Trail: Stock decrements on Billing, increments on Purchase</span>
                    <span className="font-bold text-blue-600">Auto Movement Log</span>
                  </div>
                </div>
              </div>

              {/* Copy (Right on Desktop) */}
              <div className="lg:col-span-6 space-y-5 text-left order-1 lg:order-2">
                <div className="inline-flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 border border-indigo-200/70">
                  <Package className="h-4 w-4 text-indigo-600" />
                  Real-Time Inventory Control
                </div>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
                  Smart Inventory Tracking with Low-Stock Warnings
                </h3>
                <p className="text-base text-slate-600 leading-relaxed">
                  Never face stockouts or billing delays. Viros keeps track of your warehouse quantities in real time, alerting your sales operators before an item runs out.
                </p>
                <ul className="space-y-3 pt-2">
                  <li className="flex items-start gap-3 text-sm font-medium text-slate-700">
                    <CheckCircle2 className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                    <span><strong>Live Stock Indicator in Dropdown:</strong> Operators see available units and color-coded alerts right while picking items on invoices.</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm font-medium text-slate-700">
                    <CheckCircle2 className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                    <span><strong>Automatic Stock Movement Ledger:</strong> Full audit history tracking each movement (IN on Purchase, OUT on Invoice) with balance after each transaction.</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm font-medium text-slate-700">
                    <CheckCircle2 className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                    <span><strong>Configurable Negative Stock Control:</strong> Choose whether to allow invoicing when out of stock via business settings.</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* FEATURE 3: Left Copy | Right Visual Card */}
            {/* ------------------------------------------------------------- */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Copy */}
              <div className="lg:col-span-6 space-y-5 text-left">
                <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200/70">
                  <Receipt className="h-4 w-4 text-emerald-600" />
                  Purchases & Vendor Ledgers
                </div>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
                  Streamlined Vendor Procurement & Purchase Orders
                </h3>
                <p className="text-base text-slate-600 leading-relaxed">
                  Handle vendor quotes, purchase orders, and incoming bills with complete clarity. Track partial payments, outstanding balances, and match stock receipts instantly.
                </p>
                <ul className="space-y-3 pt-2">
                  <li className="flex items-start gap-3 text-sm font-medium text-slate-700">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>PO to Purchase Conversion:</strong> Convert approved purchase orders into inward bills without re-typing product lists.</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm font-medium text-slate-700">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Payment Tracking:</strong> Record full or partial payments via Bank Transfer, Cash, Cheque, or UPI with reference IDs.</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm font-medium text-slate-700">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Vendor Ledger Reconciliation:</strong> View clear credit statements and pending payments for every supplier.</span>
                  </li>
                </ul>
              </div>

              {/* Visual Card 3 */}
              <div className="lg:col-span-6">
                <div className="rounded-3xl border border-slate-200/90 bg-gradient-to-br from-slate-50 via-white to-emerald-50/40 p-6 sm:p-8 shadow-xl shadow-slate-900/5 text-left">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-5">
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">VENDOR BILL TRACKER</span>
                      <h4 className="text-lg font-black text-slate-900">Kalyan Steel & Metal Traders</h4>
                    </div>
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
                      Bill #PB-8841
                    </span>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4 shadow-2xs text-xs">
                    <div className="grid grid-cols-2 gap-4 pb-3 border-b border-slate-100">
                      <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Payment Mode</p>
                        <p className="font-bold text-slate-800">NEFT / NetBanking</p>
                        <p className="text-[10px] text-slate-500 font-mono">Ref# TXN99482103</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Inward Bill Total</p>
                        <p className="text-base font-black text-slate-900">₹ 1,45,200</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-emerald-700">Paid Amount: ₹ 1,00,000 (69%)</span>
                        <span className="text-rose-700 font-bold">Balance Due: ₹ 45,200</span>
                      </div>
                      <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full" style={{ width: '69%' }} />
                      </div>
                    </div>

                    <div className="rounded-xl bg-emerald-50 p-3 border border-emerald-200/70 text-emerald-900 flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold">
                        <Check className="h-4 w-4 text-emerald-600" />
                        <span>Stock Inward Verified (+35 Items Added)</span>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-700">Auto Inward</span>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <Button
                      onClick={() => setRegisterOpen(true)}
                      variant="outline"
                      className="text-xs font-bold border-slate-300"
                    >
                      Explore Purchase & Vendor Management &rarr;
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* FEATURE 4: Left Visual Card | Right Copy */}
            {/* ------------------------------------------------------------- */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Visual Card 4 (Left on Desktop) */}
              <div className="lg:col-span-6 order-2 lg:order-1">
                <div className="rounded-3xl border border-slate-200/90 bg-gradient-to-bl from-slate-50 via-white to-amber-50/40 p-6 sm:p-8 shadow-xl shadow-slate-900/5 text-left">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-5">
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">TAX REPORT EXPORT</span>
                      <h4 className="text-lg font-black text-slate-900">GSTR-1 & 3B Monthly Return</h4>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                      Audit-Ready
                    </span>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-2xs text-xs">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                      <span className="text-slate-600 font-medium">Return Period:</span>
                      <span className="font-bold text-slate-900">September 2026</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 font-medium">Total Outward Supplies (Sales):</span>
                      <span className="font-bold text-slate-900">₹ 18,45,000</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 font-medium">Total Inward Supplies (Purchases):</span>
                      <span className="font-bold text-slate-900">₹ 11,20,000</span>
                    </div>
                    <div className="flex justify-between items-center text-blue-700 font-bold pt-2 border-t border-slate-100">
                      <span>Eligible Input Tax Credit (ITC):</span>
                      <span>₹ 2,01,600</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-black text-slate-900 pt-1">
                      <span>Net GST Payable (Output - ITC):</span>
                      <span className="text-emerald-700">₹ 1,30,500</span>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setRegisterOpen(true)}
                      className="rounded-xl border border-slate-300 bg-white py-2 px-3 text-xs font-bold text-slate-800 hover:bg-slate-50 flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <Download className="h-3.5 w-3.5 text-blue-600" /> Export GSTR-1 (Excel)
                    </button>
                    <button
                      onClick={() => setRegisterOpen(true)}
                      className="rounded-xl border border-slate-300 bg-white py-2 px-3 text-xs font-bold text-slate-800 hover:bg-slate-50 flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <Download className="h-3.5 w-3.5 text-blue-600" /> Export GSTR-3B (PDF)
                    </button>
                  </div>
                </div>
              </div>

              {/* Copy (Right on Desktop) */}
              <div className="lg:col-span-6 space-y-5 text-left order-1 lg:order-2">
                <div className="inline-flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 border border-amber-200/70">
                  <BarChart3 className="h-4 w-4 text-amber-600" />
                  1-Click CA-Ready Reports
                </div>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
                  Audit-Ready GSTR-1 & GSTR-3B Reports with Zero Errors
                </h3>
                <p className="text-base text-slate-600 leading-relaxed">
                  Eliminate end-of-month panic during tax filing. Viros structures all B2B invoices, B2C sales, HSN summaries, and credit notes ready for direct upload to the GST Portal.
                </p>
                <ul className="space-y-3 pt-2">
                  <li className="flex items-start gap-3 text-sm font-medium text-slate-700">
                    <CheckCircle2 className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <span><strong>1-Click Excel (.xlsx) & PDF Export:</strong> Export official GSTR-1 and GSTR-3B sheets that CAs can directly verify.</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm font-medium text-slate-700">
                    <CheckCircle2 className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <span><strong>Input Tax Credit (ITC) Summary:</strong> Reconcile tax paid on purchases with tax collected on sales to maximize savings.</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm font-medium text-slate-700">
                    <CheckCircle2 className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <span><strong>Daily & Monthly Turnover Analytics:</strong> Track top-selling products, most valuable clients, and profit margins.</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* FEATURE 5: Left Copy | Right Visual Card */}
            {/* ------------------------------------------------------------- */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Copy */}
              <div className="lg:col-span-6 space-y-5 text-left">
                <div className="inline-flex items-center gap-2 rounded-lg bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700 border border-purple-200/70">
                  <Users className="h-4 w-4 text-purple-600" />
                  Multi-User & Role Security
                </div>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
                  Granular Team Access & Multi-Device Freedom
                </h3>
                <p className="text-base text-slate-600 leading-relaxed">
                  Empower your cashiers, warehouse handlers, and accountants while keeping critical business numbers secure. Run simultaneously on desktop PCs, laptops, and smartphones.
                </p>
                <ul className="space-y-3 pt-2">
                  <li className="flex items-start gap-3 text-sm font-medium text-slate-700">
                    <CheckCircle2 className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
                    <span><strong>Restricted Cashier Access:</strong> Staff can create bills without seeing purchase rates, vendor debts, or overall business profit.</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm font-medium text-slate-700">
                    <CheckCircle2 className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
                    <span><strong>Multi-Branch Ready:</strong> Manage billing and stock across multiple branch offices from a single login.</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm font-medium text-slate-700">
                    <CheckCircle2 className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
                    <span><strong>Secure Cloud Sync:</strong> Automatic daily backups and role-based session timeouts to protect your data.</span>
                  </li>
                </ul>
              </div>

              {/* Visual Card 5 */}
              <div className="lg:col-span-6">
                <div className="rounded-3xl border border-slate-200/90 bg-gradient-to-br from-slate-50 via-white to-purple-50/40 p-6 sm:p-8 shadow-xl shadow-slate-900/5 text-left">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-600 text-white shadow-xs">
                        <Lock className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-base font-extrabold text-slate-900">Team Roles & Permissions</h4>
                        <p className="text-xs text-slate-500">4 Active users in this organization</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-800">
                      Enterprise Tier
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="rounded-xl border border-slate-200 bg-white p-3 flex items-center justify-between shadow-2xs">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                          VK
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">Vipin Kumar</p>
                          <p className="text-[11px] text-slate-500">Billing Counter 1 &bull; Staff</p>
                        </div>
                      </div>
                      <span className="rounded-md bg-blue-50 px-2 py-1 font-bold text-blue-700 text-[11px]">
                        Invoices & POS Only
                      </span>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-3 flex items-center justify-between shadow-2xs">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">
                          SP
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">Suresh Patel</p>
                          <p className="text-[11px] text-slate-500">Warehouse Manager</p>
                        </div>
                      </div>
                      <span className="rounded-md bg-indigo-50 px-2 py-1 font-bold text-indigo-700 text-[11px]">
                        Inventory & Stock Movement
                      </span>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-3 flex items-center justify-between shadow-2xs">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                          AM
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">Anita Mahajan</p>
                          <p className="text-[11px] text-slate-500">Chief Accountant</p>
                        </div>
                      </div>
                      <span className="rounded-md bg-emerald-50 px-2 py-1 font-bold text-emerald-700 text-[11px]">
                        GST Reports & Ledgers
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1.5 font-medium text-emerald-600">
                      <Check className="h-4 w-4" /> 256-bit Encrypted Cloud Security
                    </span>
                    <button
                      onClick={() => setRegisterOpen(true)}
                      className="font-bold text-purple-600 hover:underline"
                    >
                      Invite Team Members &rarr;
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* CUSTOMER FEEDBACK & REVIEWS SECTION */}
        {/* ========================================================================= */}
        <section id="testimonials" className="py-24 bg-slate-50 border-t border-slate-200/80 scroll-mt-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <div className="inline-flex items-center gap-1.5 text-amber-500 mb-2">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
                Loved by 15,000+ Business Owners & Accountants
              </h2>
              <p className="mt-3 text-base text-slate-600">
                Read how Indian manufacturers, wholesalers, and retail store owners modernized their operations with Viros.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {testimonials.map((review, i) => (
                <div
                  key={i}
                  className="rounded-3xl border border-slate-200 bg-white p-7 shadow-xs hover:shadow-md transition-all text-left flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex gap-1 text-amber-400">
                        {[...Array(review.rating)].map((_, idx) => (
                          <Star key={idx} className="h-4 w-4 fill-current" />
                        ))}
                      </div>
                      <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                        {review.highlight}
                      </span>
                    </div>

                    <p className="text-sm sm:text-base leading-relaxed text-slate-700 italic">
                      "{review.comment}"
                    </p>
                  </div>

                  <div className="flex items-center gap-3.5 pt-5 mt-5 border-t border-slate-100">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-sm shadow-xs">
                      {review.avatar}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{review.name}</h4>
                      <p className="text-xs text-slate-500 font-medium">
                        {review.role} &bull; <span className="text-slate-700 font-semibold">{review.company}</span> ({review.city})
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* FAQ ACCORDION SECTION */}
        {/* ========================================================================= */}
        <section id="faq" className="py-20 bg-white border-t border-slate-200 scroll-mt-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                Got Questions?
              </span>
              <h2 className="mt-2 text-3xl font-extrabold text-slate-900">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="space-y-4 text-left">
              {faqs.map((faq, idx) => {
                const isOpen = openFaq === idx
                return (
                  <div
                    key={idx}
                    className="rounded-2xl border border-slate-200 bg-slate-50/60 overflow-hidden transition-all shadow-2xs"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="flex w-full items-center justify-between p-5 text-left text-sm sm:text-base font-bold text-slate-900 hover:text-blue-600 transition-colors"
                    >
                      <span>{faq.q}</span>
                      <ChevronDown
                        className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-600' : ''
                          }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 text-sm leading-relaxed text-slate-600 border-t border-slate-200/80 pt-3 bg-white">
                        {faq.a}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* FINAL HIGH-CONVERTING CTA BANNER */}
        {/* ========================================================================= */}
        <section className="relative overflow-hidden bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 py-16 text-white text-center">
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px] opacity-10 pointer-events-none" />

          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 relative space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1 text-xs sm:text-sm font-semibold text-blue-100 backdrop-blur-md">
              <Award className="h-4 w-4 text-amber-300" />
              Start Your Free 14-Day Full Access Trial
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
              Ready to Modernize Your Business Billing?
            </h2>

            <p className="text-base sm:text-lg text-blue-100 max-w-2xl mx-auto">
              Join 15,000+ happy Indian businesses who save time and eliminate tax errors with Viros GST Billing.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button
                size="lg"
                onClick={() => setRegisterOpen(true)}
                className="h-12 px-8 text-base bg-white text-blue-900 hover:bg-blue-50 font-bold shadow-xl transition-transform hover:scale-105"
              >
                Create Free Account
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="h-12 px-8 text-base border-white/40 text-slate-900 bg-white hover:bg-white/90 font-bold"
              >
                <Link href="/login">Sign In to Dashboard</Link>
              </Button>
            </div>

            <p className="text-xs text-blue-200/80 font-medium">
              Setup takes less than 2 minutes &bull; Instant tax compliance &bull; Dedicated phone support
            </p>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* FOOTER */}
        {/* ========================================================================= */}
        <footer className="border-t border-slate-200 bg-white pt-12 pb-8 text-slate-700">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pb-10 border-b border-slate-200">
              {/* Column 1: Company Info */}
              <div className="space-y-4 text-left">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-900/10">
                    <img
                      src="/logo.png"
                      alt="Viros Logo"
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
              <div className="space-y-3 text-left">
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
                    <a href="#stats" className="hover:text-blue-600 transition-colors inline-flex items-center gap-1">
                      Platform Stats
                    </a>
                  </li>
                  <li>
                    <a href="#testimonials" className="hover:text-blue-600 transition-colors inline-flex items-center gap-1">
                      Client Feedback
                    </a>
                  </li>
                  <li>
                    <Link href="/login" className="hover:text-blue-600 transition-colors inline-flex items-center gap-1">
                      Sign In Account
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Column 3: Solutions */}
              <div className="space-y-3 text-left">
                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                  Solutions
                </h4>
                <ul className="space-y-2 text-sm font-medium text-slate-600">
                  <li>GST Compliant Invoicing</li>
                  <li>Real-time Inventory Tracking</li>
                  <li>Purchase Order & Vendor Management</li>
                  <li>Automated GST Summary Reports</li>
                  <li>Role-based Access & Security</li>
                  <li>Thermal & Barcode Label Printing</li>
                </ul>
              </div>

              {/* Column 4: Contact Us */}
              <div className="space-y-3 text-left">
                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                  Contact Us
                </h4>
                <ul className="space-y-3 text-sm font-medium">
                  <li>
                    <a
                      href="mailto:sales@virosentrepreneurs.com"
                      className="group flex items-center gap-2.5 text-slate-700 hover:text-blue-600 transition-colors"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <Mail className="h-4 w-4" />
                      </div>
                      <span className="break-all font-semibold">sales@virosentrepreneurs.com</span>
                    </a>
                  </li>

                  <li>
                    <a
                      href="mailto:software@virosentrepreneurs.in"
                      className="group flex items-center gap-2.5 text-slate-700 hover:text-blue-600 transition-colors"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <Mail className="h-4 w-4" />
                      </div>
                      <span className="break-all font-semibold">software@virosentrepreneurs.in</span>
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
            <div className="pt-6 text-center text-xs sm:text-sm font-semibold text-slate-500">
              &copy; {new Date().getFullYear()} Viros Entrepreneurs IT Solutions Pvt. Ltd. All rights reserved.
            </div>
          </div>
        </footer>
      </div>

      {/* Product Demo Dialog */}
      <Dialog open={demoModalOpen} onOpenChange={setDemoModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">
              Quick Viros ERP Overview
            </DialogTitle>
            <DialogDescription>
              A fast, cloud-connected GST ERP system engineered for Indian trade & retail businesses.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3 text-left text-sm text-slate-700">
            <div className="rounded-xl bg-blue-50 p-4 border border-blue-100 space-y-2">
              <h4 className="font-bold text-blue-900 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-600" /> What's inside Viros GST Billing:
              </h4>
              <ul className="space-y-1.5 text-xs text-blue-800 font-medium">
                <li>&bull; Instant Tax Invoices, Quotations, and Delivery Challans with QR code</li>
                <li>&bull; Multiple line items with same or different products & batches</li>
                <li>&bull; Auto stock deduction and low-inventory alerts</li>
                <li>&bull; Automatic CGST, SGST, IGST calculations</li>
                <li>&bull; WhatsApp & Email PDF invoice sharing directly to customers</li>
              </ul>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDemoModalOpen(false)}>
                Close
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                onClick={() => {
                  setDemoModalOpen(false)
                  setRegisterOpen(true)
                }}
              >
                Register Free Account
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <RegisterSlidePanel open={registerOpen} onOpenChange={setRegisterOpen} />
    </>
  )
}
