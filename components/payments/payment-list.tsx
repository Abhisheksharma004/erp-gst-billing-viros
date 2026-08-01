'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Trash2,
  Eye,
  FileText,
  Calendar,
  Wallet,
  Building,
  CreditCard,
  CheckCircle2,
  ExternalLink,
  Users,
  AlertCircle,
  LayoutGrid,
  Table as TableIcon,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SearchablePartySelect } from '@/components/ui/searchable-party-select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { AddPaymentModal } from './add-payment-modal'

interface PaymentListProps {
  initialType?: 'ALL' | 'INWARD' | 'OUTWARD'
  title?: string
  description?: string
  hideTypeFilter?: boolean
}

export function PaymentList({
  initialType = 'ALL',
  title = 'Payments',
  description = 'Unified view and management of customer receipts (Inward) and vendor payments (Outward).',
  hideTypeFilter = false,
}: PaymentListProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [payments, setPayments] = useState<any[]>([])
  const [summary, setSummary] = useState({ totalInward: 0, totalOutward: 0, netCashflow: 0 })
  const [total, setTotal] = useState(0)

  // View Mode & Mobile Responsive State
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table')
  const [isMobile, setIsMobile] = useState(false)

  const showTable = viewMode === 'table' && !isMobile

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  // Filter States
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INWARD' | 'OUTWARD'>(initialType)
  const [search, setSearch] = useState('')
  const [modeFilter, setModeFilter] = useState('ALL')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(1)

  // Party Filter & Due Amount State
  const [partyType, setPartyType] = useState<'CUSTOMER' | 'VENDOR'>('CUSTOMER')
  const [selectedPartyId, setSelectedPartyId] = useState<string>('ALL')
  const [partyOptions, setPartyOptions] = useState<any[]>([])
  const [partyDueInfo, setPartyDueInfo] = useState<{
    name: string
    totalDue: number
    unpaidCount: number
  } | null>(null)

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [paymentToDelete, setPaymentToDelete] = useState<any | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch Party Options when partyType changes
  useEffect(() => {
    const fetchPartyOptions = async () => {
      try {
        const endpoint = partyType === 'CUSTOMER' ? '/api/customers?limit=100' : '/api/vendors?limit=100'
        const res = await fetch(endpoint)
        if (res.ok) {
          const data = await res.json()
          setPartyOptions(partyType === 'CUSTOMER' ? data.customers || [] : data.vendors || [])
        }
      } catch (err) {
        console.error('Fetch party options error:', err)
      }
    }
    fetchPartyOptions()
  }, [partyType])

  // Fetch selected party due info when selectedPartyId changes
  useEffect(() => {
    if (!selectedPartyId || selectedPartyId === 'ALL') {
      setPartyDueInfo(null)
      return
    }

    const fetchPartyDue = async () => {
      try {
        const res = await fetch(`/api/payments/party-due?partyType=${partyType}&partyId=${selectedPartyId}`)
        if (res.ok) {
          const data = await res.json()
          setPartyDueInfo({
            name: data.name,
            totalDue: data.totalDue || 0,
            unpaidCount: data.unpaidCount || 0,
          })
        }
      } catch (err) {
        console.error('Fetch party due error:', err)
      }
    }
    fetchPartyDue()
  }, [selectedPartyId, partyType])

  const fetchPayments = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (typeFilter !== 'ALL') params.set('type', typeFilter)
      if (search.trim()) params.set('search', search.trim())
      if (modeFilter !== 'ALL') params.set('paymentMode', modeFilter)
      if (fromDate) params.set('fromDate', fromDate)
      if (toDate) params.set('toDate', toDate)
      
      if (selectedPartyId && selectedPartyId !== 'ALL') {
        if (partyType === 'CUSTOMER') params.set('customerId', selectedPartyId)
        if (partyType === 'VENDOR') params.set('vendorId', selectedPartyId)
      }

      params.set('page', page.toString())
      params.set('limit', '20')

      const res = await fetch(`/api/payments?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setPayments(data.payments || [])
        setTotal(data.total || 0)
        if (data.summary) setSummary(data.summary)
      } else {
        toast({
          title: 'Error',
          description: 'Failed to fetch payment records',
          variant: 'destructive',
        })
      }
    } catch (err) {
      console.error('Fetch payments error:', err)
    } finally {
      setLoading(false)
    }
  }, [typeFilter, search, modeFilter, fromDate, toDate, selectedPartyId, partyType, page, toast])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  const handleResetFilters = () => {
    setTypeFilter(initialType)
    setSearch('')
    setModeFilter('ALL')
    setFromDate('')
    setToDate('')
    setSelectedPartyId('ALL')
    setPartyDueInfo(null)
    setPage(1)
  }

  const handleDeletePayment = async () => {
    if (!paymentToDelete) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/payments/${paymentToDelete.id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (res.ok) {
        toast({
          title: 'Payment Deleted',
          description: data.message || 'Payment deleted and linked balances reverted.',
        })
        fetchPayments()
      } else {
        throw new Error(data.error || 'Failed to delete payment')
      }
    } catch (err: any) {
      toast({
        title: 'Delete Failed',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
      setPaymentToDelete(null)
    }
  }

  const renderCardGrid = () => (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 p-3 sm:p-4">
      {payments.map((p) => {
        const isInward = p.type === 'INWARD'
        const partyName = isInward ? p.customer_name || 'Customer' : p.vendor_name || 'Vendor'
        const linkedNo = isInward ? p.linked_invoice_no : p.linked_bill_no
        return (
          <div key={p.id} className="rounded-xl border bg-card shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="p-3 sm:p-4 space-y-3">
              {/* Header: Payment No & Badge + Actions */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-mono text-xs font-semibold text-muted-foreground block">{p.payment_no}</span>
                  <Badge className={isInward ? 'bg-emerald-100 text-emerald-800 border-emerald-200 mt-1' : 'bg-blue-100 text-blue-800 border-blue-200 mt-1'}>
                    {isInward ? 'INWARD (RECEIPT)' : 'OUTWARD (PAID)'}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="View Details"
                    onClick={() => { setSelectedPayment(p); setIsViewModalOpen(true); }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    title="Delete Payment"
                    onClick={() => setPaymentToDelete(p)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Amount & Party */}
              <div className="border-t border-b py-2 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Amount:</span>
                  <span className={`text-base font-bold ${isInward ? 'text-emerald-600' : 'text-blue-600'}`}>
                    {isInward ? '+' : '-'} ₹{Number(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Party:</span>
                  <span className="font-semibold text-foreground truncate max-w-[180px]">{partyName}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Date:</span>
                  <span>{new Date(p.payment_date).toLocaleDateString('en-IN')}</span>
                </div>
              </div>

              {/* Mode, Ref & Linked Document */}
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Mode:</span>
                  <span className="font-medium text-foreground">{p.payment_mode?.replace('_', ' ')}</span>
                </div>
                {p.reference_no && (
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Ref #:</span>
                    <span className="font-mono text-foreground">{p.reference_no}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-1">
                  <span className="text-muted-foreground">Linked Document:</span>
                  {linkedNo ? (
                    <div className="flex items-center gap-1">
                      <Link
                        href={isInward ? `/billing/${p.invoice_id}` : `/purchases/${p.purchase_id}`}
                        className="font-mono text-xs font-medium text-blue-600 hover:underline flex items-center gap-0.5"
                      >
                        {linkedNo} <ExternalLink className="h-3 w-3" />
                      </Link>
                      {(p.notes?.includes('Adjusted') || p.reference_no?.includes('Advance Adj') || p.payment_no?.includes('-ADJ')) && (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-[10px] py-0 px-1 font-semibold">
                          Adjusted
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300 text-[10px] font-normal">
                      Advance Payment
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )

  return (
    <div className="space-y-6 min-w-0">
      {/* Header Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPayments}
            disabled={loading}
            className="h-9"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Payment
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <Card className="p-3 sm:p-4 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by Payment #, Ref #, Customer, or Vendor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          {/* Type Filter Buttons */}
          {!hideTypeFilter && (
            <div className="inline-flex rounded-lg border bg-background p-1 text-xs overflow-x-auto max-w-full">
              <button
                onClick={() => { setTypeFilter('ALL'); setPage(1) }}
                className={`px-3 py-1.5 font-medium rounded-md transition-colors whitespace-nowrap ${
                  typeFilter === 'ALL'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All Transactions
              </button>
              <button
                onClick={() => { setTypeFilter('INWARD'); setPage(1) }}
                className={`px-3 py-1.5 font-medium rounded-md transition-colors whitespace-nowrap ${
                  typeFilter === 'INWARD'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Inward (Receipts)
              </button>
              <button
                onClick={() => { setTypeFilter('OUTWARD'); setPage(1) }}
                className={`px-3 py-1.5 font-medium rounded-md transition-colors whitespace-nowrap ${
                  typeFilter === 'OUTWARD'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Outward (Paid)
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            {/* Payment Mode Selector */}
            <Select value={modeFilter} onValueChange={(val) => { setModeFilter(val); setPage(1) }}>
              <SelectTrigger className="w-[140px] sm:w-[160px] h-9 text-xs">
                <SelectValue placeholder="All Modes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Modes</SelectItem>
                <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                <SelectItem value="UPI">UPI</SelectItem>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="CHEQUE">Cheque</SelectItem>
                <SelectItem value="CARD">Credit / Debit Card</SelectItem>
              </SelectContent>
            </Select>

            {/* Reset Filters */}
            <Button variant="ghost" size="sm" onClick={handleResetFilters} className="h-9 px-3 text-xs shrink-0">
              Reset Filters
            </Button>
          </div>
        </div>

        {/* Second Row: Party-Wise Due Filter & Date Range */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 pt-3 border-t">
          {/* Party Wise Filter */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap text-xs w-full lg:w-auto">
            <span className="font-semibold text-muted-foreground flex items-center gap-1 whitespace-nowrap shrink-0">
              <Users className="h-3.5 w-3.5" />
              Party Wise Filter:
            </span>
            <Select
              value={partyType}
              onValueChange={(val: 'CUSTOMER' | 'VENDOR') => {
                setPartyType(val)
                setSelectedPartyId('ALL')
                setPage(1)
              }}
            >
              <SelectTrigger className="w-[110px] h-8 text-xs shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CUSTOMER">Customer</SelectItem>
                <SelectItem value="VENDOR">Vendor</SelectItem>
              </SelectContent>
            </Select>

            <SearchablePartySelect
              value={selectedPartyId}
              onValueChange={(val) => {
                setSelectedPartyId(val)
                setPage(1)
              }}
              options={partyOptions}
              placeholder={`All ${partyType === 'CUSTOMER' ? 'Customers' : 'Vendors'}`}
              allOptionLabel={`All ${partyType === 'CUSTOMER' ? 'Customers' : 'Vendors'}`}
              containerClassName="w-[180px] sm:w-[220px] shrink-0"
              className="h-8 text-xs"
            />
          </div>

          {/* Date Filters & View Mode Toggle */}
          <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground w-full lg:w-auto">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span className="whitespace-nowrap">From:</span>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setPage(1) }}
                className="h-8 w-32 sm:w-36 text-xs"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span className="whitespace-nowrap">To:</span>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setPage(1) }}
                className="h-8 w-32 sm:w-36 text-xs"
              />
            </div>

            {/* View Mode Toggle on right side of Date Selection */}
            <div className="flex items-center border rounded-md p-0.5 bg-background ml-1">
              <Button
                variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-7 w-7"
                onClick={() => setViewMode('table')}
                title="Table View"
              >
                <TableIcon className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={viewMode === 'card' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-7 w-7"
                onClick={() => setViewMode('card')}
                title="Card View"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Selected Party Total Due Banner */}
      {partyDueInfo && (
        <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-900 shadow-sm p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-base text-amber-900 dark:text-amber-200">
                  {partyDueInfo.name} ({partyType === 'CUSTOMER' ? 'Customer' : 'Vendor'})
                </h3>
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  {partyDueInfo.unpaidCount} unpaid {partyType === 'CUSTOMER' ? 'invoices' : 'bills'} pending
                </p>
              </div>
            </div>
            <div className="sm:text-right">
              <span className="text-xs text-amber-800 dark:text-amber-300 block font-medium">
                Total Outstanding Due Amount
              </span>
              <span className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                ₹{partyDueInfo.totalDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Transaction Data Table / Cards */}
      <Card className="shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-muted-foreground">Loading payments...</div>
        ) : payments.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">No payment records found matching criteria.</div>
        ) : showTable ? (
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[130px]">Payment #</TableHead>
                <TableHead className="w-[110px]">Date</TableHead>
                <TableHead className="w-[100px]">Type</TableHead>
                <TableHead>Party Name</TableHead>
                <TableHead>Linked Bill / Invoice</TableHead>
                <TableHead>Mode & Ref #</TableHead>
                <TableHead className="text-right">Amount (₹)</TableHead>
                <TableHead className="text-center w-[90px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                    Loading payments...
                  </TableCell>
                </TableRow>
              ) : payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                    No payment records found matching criteria.
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((p) => {
                  const isInward = p.type === 'INWARD'
                  const partyName = isInward ? p.customer_name : p.vendor_name
                  const linkedNo = isInward ? p.linked_invoice_no : p.linked_bill_no
                  const payDate = p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-IN') : 'N/A'

                  return (
                    <TableRow key={p.id} className="hover:bg-muted/30">
                      <TableCell className="font-semibold text-xs">{p.payment_no}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{payDate}</TableCell>
                      <TableCell>
                        {isInward ? (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1 w-max">
                            <ArrowDownLeft className="h-3 w-3" />
                            Inward
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-300 flex items-center gap-1 w-max">
                            <ArrowUpRight className="h-3 w-3" />
                            Outward
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {partyName || <span className="text-muted-foreground italic">General / Direct</span>}
                      </TableCell>
                      <TableCell className="text-xs">
                        {linkedNo ? (
                          isInward && p.invoice_id ? (
                            <div className="flex flex-col gap-1 items-start">
                              <Link
                                href={`/billing/${p.invoice_id}`}
                                className="font-mono bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded text-xs inline-flex items-center gap-1 font-semibold transition-colors hover:underline"
                                title={`View Sales Invoice ${linkedNo}`}
                              >
                                <span>{linkedNo}</span>
                                <ExternalLink className="h-3 w-3" />
                              </Link>
                              {(p.notes?.includes('Adjusted') || p.reference_no?.includes('Advance Adj') || p.payment_no?.includes('-ADJ')) && (
                                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-[10px] py-0 px-1.5 font-semibold">
                                  Adjusted
                                </Badge>
                              )}
                            </div>
                          ) : !isInward && p.purchase_id ? (
                            <div className="flex flex-col gap-1 items-start">
                              <Link
                                href={`/purchases/${p.purchase_id}`}
                                className="font-mono bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded text-xs inline-flex items-center gap-1 font-semibold transition-colors hover:underline"
                                title={`View Purchase Bill ${linkedNo}`}
                              >
                                <span>{linkedNo}</span>
                                <ExternalLink className="h-3 w-3" />
                              </Link>
                              {(p.notes?.includes('Adjusted') || p.reference_no?.includes('Advance Adj') || p.payment_no?.includes('-ADJ')) && (
                                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-[10px] py-0 px-1.5 font-semibold">
                                  Adjusted
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="font-mono bg-muted px-2 py-0.5 rounded text-foreground">
                              {linkedNo}
                            </span>
                          )
                        ) : (
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300 text-xs font-normal">
                            Advance Payment
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium">{p.payment_mode?.replace('_', ' ')}</div>
                        {p.reference_no && (
                          <div className="text-[11px] text-muted-foreground font-mono">Ref: {p.reference_no}</div>
                        )}
                      </TableCell>
                      <TableCell className={`text-right font-semibold text-sm ${isInward ? 'text-emerald-600' : 'text-blue-600'}`}>
                        {isInward ? '+' : '-'} ₹{Number(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            title="View Voucher"
                            onClick={() => {
                              setSelectedPayment(p)
                              setIsViewModalOpen(true)
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                            title="Delete Payment"
                            onClick={() => setPaymentToDelete(p)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      ) : (
        renderCardGrid()
      )}
          {total > 20 && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {Math.min((page - 1) * 20 + 1, total)} to {Math.min(page * 20, total)} of {total} records (Page {page} of {Math.ceil(total / 20)})
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page * 20 >= total}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>

      {/* Add Payment Modal */}
      <AddPaymentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={fetchPayments}
        defaultType={initialType === 'OUTWARD' ? 'OUTWARD' : 'INWARD'}
      />

      {/* View Payment Voucher Details Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary font-medium text-xs">
              <FileText className="h-4 w-4" />
              <span>Payment Receipt Voucher</span>
            </div>
            <DialogTitle className="text-xl font-bold">
              {selectedPayment?.payment_no}
            </DialogTitle>
            <DialogDescription>
              Transaction receipt details and allocation.
            </DialogDescription>
          </DialogHeader>

          {selectedPayment && (
            <div className="space-y-4 text-sm border-t pt-3">
              <div className="grid grid-cols-2 gap-3 bg-muted/30 p-3 rounded-lg border">
                <div>
                  <span className="text-xs text-muted-foreground block">Payment Type</span>
                  <Badge variant="outline" className={selectedPayment.type === 'INWARD' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}>
                    {selectedPayment.type === 'INWARD' ? 'Payment Inward (Receipt)' : 'Payment Outward (Paid)'}
                  </Badge>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Payment Date</span>
                  <span className="font-semibold">
                    {new Date(selectedPayment.payment_date).toLocaleDateString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">
                    {selectedPayment.type === 'INWARD' ? 'Customer' : 'Vendor'}
                  </span>
                  <span className="font-semibold">
                    {selectedPayment.customer_name || selectedPayment.vendor_name || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Amount</span>
                  <span className="font-bold text-emerald-600 text-base">
                    ₹{Number(selectedPayment.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">Payment Mode:</span>
                  <span className="font-medium">{selectedPayment.payment_mode?.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span className="text-muted-foreground">Reference / UTR No:</span>
                  <span className="font-mono">{selectedPayment.reference_no || 'N/A'}</span>
                </div>
                {selectedPayment.bank_name && (
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-muted-foreground">Bank Name:</span>
                    <span>{selectedPayment.bank_name}</span>
                  </div>
                )}
                <div className="flex justify-between py-1 border-b items-center">
                  <span className="text-muted-foreground">Linked Document:</span>
                  {selectedPayment.type === 'INWARD' && selectedPayment.invoice_id ? (
                    <Link
                      href={`/billing/${selectedPayment.invoice_id}`}
                      className="font-mono font-semibold text-emerald-600 hover:underline flex items-center gap-1"
                    >
                      <span>{selectedPayment.linked_invoice_no}</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  ) : selectedPayment.type === 'OUTWARD' && selectedPayment.purchase_id ? (
                    <Link
                      href={`/purchases/${selectedPayment.purchase_id}`}
                      className="font-mono font-semibold text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <span>{selectedPayment.linked_bill_no}</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  ) : (
                    <span className="font-mono text-muted-foreground italic">
                      {selectedPayment.type === 'INWARD'
                        ? selectedPayment.linked_invoice_no || 'Advance Payment'
                        : selectedPayment.linked_bill_no || 'Advance Payment'}
                    </span>
                  )}
                </div>
                {selectedPayment.notes && (
                  <div className="pt-2">
                    <span className="text-muted-foreground block mb-1">Remarks / Notes:</span>
                    <p className="bg-muted p-2 rounded text-foreground italic">{selectedPayment.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={Boolean(paymentToDelete)} onOpenChange={() => setPaymentToDelete(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Payment {paymentToDelete?.payment_no}?</DialogTitle>
            <DialogDescription>
              This action will delete the payment record and automatically adjust/revert the paid & balance amounts on the linked invoice or bill.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button variant="outline" onClick={() => setPaymentToDelete(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              onClick={handleDeletePayment}
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isDeleting ? 'Deleting...' : 'Confirm Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
