'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SearchablePartySelect } from '@/components/ui/searchable-party-select'
import { FileSpreadsheet, FileText, Search, TrendingUp, Receipt, Wallet, Scale } from 'lucide-react'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { usePageCount } from '@/hooks/use-page-count'
import { useToast } from '@/hooks/use-toast'

const REPORT_TYPES = [
  { value: 'sales-summary', label: 'Sales Summary' },
  { value: 'purchase-summary', label: 'Purchase Summary' },
  { value: 'gst-sales', label: 'GST Sales Register' },
  { value: 'gst-purchase', label: 'GST Purchase Register' },
  { value: 'stock-report', label: 'Stock Report' },
  { value: 'low-stock', label: 'Low Stock Report' },
  { value: 'customer-ledger', label: 'Customer Ledger' },
  { value: 'vendor-ledger', label: 'Vendor Ledger' },
]

const exportExcelWrapClass =
  'rounded-md bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 p-[2px] shadow-sm'

const exportExcelBtnClass = cn(
  'h-9 border-0 bg-background text-emerald-800 hover:bg-emerald-50',
  'dark:text-emerald-300 dark:hover:bg-emerald-950/40'
)

const exportPdfWrapClass =
  'rounded-md bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-[2px] shadow-sm'

const exportPdfBtnClass = cn(
  'h-9 border-0 bg-background text-indigo-800 hover:bg-indigo-50',
  'dark:text-indigo-300 dark:hover:bg-indigo-950/40'
)

export default function ReportsPage() {
  usePageCount('Generate and export business reports')
  const { toast } = useToast()
  const [reportType, setReportType] = useState('sales-summary')
  const [from, setFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0])
  const [to, setTo] = useState(new Date().toISOString().split('T')[0])
  const [partyId, setPartyId] = useState('ALL')
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([])
  const [vendors, setVendors] = useState<{ id: string; name: string }[]>([])
  const [data, setData] = useState<any[]>([])
  const [summary, setSummary] = useState<Record<string, any> | null>(null)
  const [loading, setLoading] = useState(false)
  const [hasRun, setHasRun] = useState(false)

  useEffect(() => {
    fetch('/api/reports?type=options')
      .then((res) => res.json())
      .then((resData) => {
        if (Array.isArray(resData.customers)) setCustomers(resData.customers)
        if (Array.isArray(resData.vendors)) setVendors(resData.vendors)
      })
      .catch(() => {})
  }, [])

  const resetReportResults = () => {
    setData([])
    setSummary(null)
    setHasRun(false)
  }

  const handleReportTypeChange = (value: string) => {
    setReportType(value)
    setPartyId('ALL')
    resetReportResults()
  }

  const isCustomerReport = ['sales-summary', 'gst-sales', 'customer-ledger'].includes(reportType)
  const isVendorReport = ['purchase-summary', 'gst-purchase', 'vendor-ledger'].includes(reportType)
  const showDateRange = !['stock-report', 'low-stock'].includes(reportType)

  const selectedPartyName = () => {
    if (partyId === 'ALL') return 'All Parties'
    if (isCustomerReport) {
      const c = customers.find((item) => item.id === partyId)
      return c ? c.name : 'Selected Customer'
    }
    if (isVendorReport) {
      const v = vendors.find((item) => item.id === partyId)
      return v ? v.name : 'Selected Vendor'
    }
    return 'All Parties'
  }

  const selectedReportLabel = () => {
    const r = REPORT_TYPES.find((item) => item.value === reportType)
    return r ? r.label : 'Report'
  }

  const fetchReport = async () => {
    if (showDateRange && from && to && from > to) {
      toast({ title: 'From date cannot be after To date', variant: 'destructive' })
      return
    }

    setLoading(true)
    setHasRun(true)
    try {
      const params = new URLSearchParams({ type: reportType, from, to, partyId })
      const res = await fetch(`/api/reports?${params}`)
      const result = await res.json()
      if (!res.ok) {
        toast({ title: result.error || 'Failed to load report', variant: 'destructive' })
        setData([])
        setSummary(null)
        return
      }
      setData(Array.isArray(result.data) ? result.data : [])
      setSummary(result.summary ?? null)
    } catch {
      toast({ title: 'Failed to load report', variant: 'destructive' })
      setData([])
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }

  const exportExcel = async () => {
    const { exportToExcel } = await import('@/lib/excel-export')
    
    // Construct rows with From Date and To Date header info
    const metaHeaderRow = {
      'Report Type': selectedReportLabel(),
      'From Date': formatDate(from),
      'To Date': formatDate(to),
      'Party Name': selectedPartyName(),
      'Generated Date': formatDate(new Date().toISOString().split('T')[0]),
    }

    const dataRows = data.map((row: any) => {
      if (reportType === 'sales-summary') {
        return {
          Date: formatDate(row.date),
          'Invoice Number': row.invoiceNo,
          'Customer Name': row.customerName || row.customer?.name,
          'Taxable Amount': Number(row.taxableAmount || 0),
          'Tax Amount': Number(row.taxAmount || 0),
          'Total Amount': Number(row.totalAmount || 0),
        }
      }
      if (reportType === 'gst-sales') {
        return {
          'Invoice No': row.invoiceNo,
          Customer: row.customerName || row.customer?.name,
          GSTIN: row.gstin || row.customer?.gstin || '-',
          Date: formatDate(row.date),
          'Taxable Amount': Number(row.taxableAmount || 0),
          CGST: Number(row.cgstAmount || 0),
          SGST: Number(row.sgstAmount || 0),
          IGST: Number(row.igstAmount || 0),
          'Total Tax': Number(row.taxAmount || 0),
          'Total Amount': Number(row.totalAmount || 0),
        }
      }
      if (reportType === 'purchase-summary') {
        return {
          'Bill No': row.purchaseNo,
          Vendor: row.vendorName || row.vendor?.name,
          Date: formatDate(row.date),
          'Taxable Amount': Number(row.taxableAmount || 0),
          'Tax Amount': Number(row.taxAmount || 0),
          'Total Amount': Number(row.totalAmount || 0),
          Paid: Number(row.paidAmount || 0),
          Balance: Number(row.balanceAmount || 0),
        }
      }
      if (reportType === 'gst-purchase') {
        return {
          'Bill No': row.purchaseNo,
          Vendor: row.vendorName || row.vendor?.name,
          GSTIN: row.gstin || row.vendor?.gstin || '-',
          Date: formatDate(row.date),
          'Taxable Amount': Number(row.taxableAmount || 0),
          CGST: Number(row.cgstAmount || 0),
          SGST: Number(row.sgstAmount || 0),
          IGST: Number(row.igstAmount || 0),
          'Total Tax': Number(row.taxAmount || 0),
          'Total Amount': Number(row.totalAmount || 0),
        }
      }
      if (reportType === 'stock-report' || reportType === 'low-stock') {
        return {
          Product: row.name,
          Description: row.description || '-',
          HSN: row.hsn,
          Stock: Number(row.currentStock),
        }
      }
      if (reportType === 'customer-ledger') {
        return {
          Date: formatDate(row.date),
          'Party Name': row.partyName,
          Voucher: row.voucherType,
          'Invoice No. / Payment ID': row.refNo,
          'Mode of payment / Ref No': row.description,
          Debit: Number(row.debit || 0),
          Credit: Number(row.credit || 0),
          Balance: Number(row.balance || 0),
        }
      }
      if (reportType === 'vendor-ledger') {
        return {
          Date: formatDate(row.date),
          'Party Name': row.partyName,
          Voucher: row.voucherType,
          'Bill No. / Payment ID': row.refNo,
          'Mode of payment / Ref No': row.description,
          Credit: Number(row.credit || 0),
          Debit: Number(row.debit || 0),
          Balance: Number(row.balance || 0),
        }
      }
      return row
    })

    // Prepend metadata info row & summary row to excel export
    const excelExportRows: Record<string, unknown>[] = [
      metaHeaderRow,
      ...dataRows,
    ]

    if (summary && reportType === 'customer-ledger') {
      const bal = Number(summary.closing_balance || 0)
      const drCr = bal >= 0 ? 'Dr' : 'Cr'
      excelExportRows.push({
        Date: 'TOTAL',
        'Party Name': '-',
        Voucher: '-',
        'Invoice No. / Payment ID': '-',
        'Mode of payment / Ref No': 'Total',
        Debit: Number(summary.total_debit || 0),
        Credit: Number(summary.total_credit || 0),
        Balance: '-',
      })
      excelExportRows.push({
        Date: 'CLOSING BALANCE',
        'Party Name': selectedPartyName(),
        Voucher: '-',
        'Invoice No. / Payment ID': '-',
        'Mode of payment / Ref No': 'Closing Bal.',
        Debit: 0,
        Credit: `${formatCurrency(Math.abs(bal))} ${drCr}`,
        Balance: '-',
      })
    } else if (summary && reportType === 'vendor-ledger') {
      const bal = Number(summary.closing_balance || 0)
      const drCr = bal >= 0 ? 'Cr' : 'Dr'
      excelExportRows.push({
        Date: 'TOTAL',
        'Party Name': '-',
        Voucher: '-',
        'Bill No. / Payment ID': '-',
        'Mode of payment / Ref No': 'Total',
        Credit: Number(summary.total_credit || 0),
        Debit: Number(summary.total_debit || 0),
        Balance: '-',
      })
      excelExportRows.push({
        Date: 'CLOSING BALANCE',
        'Party Name': selectedPartyName(),
        Voucher: '-',
        'Bill No. / Payment ID': '-',
        'Mode of payment / Ref No': 'Closing Bal.',
      })
    }

    const sanitizeFilename = (str: string) =>
      str
        .trim()
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/_+/g, '_')

    const todayStr = new Date().toISOString().split('T')[0]
    const party = selectedPartyName()

    let filename = ''
    if (partyId && partyId !== 'ALL' && party && party !== 'All Parties' && party !== 'ALL') {
      filename = `${sanitizeFilename(party)}_Ledger_${todayStr}.xls`
    } else {
      filename = `${sanitizeFilename(selectedReportLabel())}_ALL_${todayStr}.xls`
    }

    exportToExcel(excelExportRows, filename, selectedReportLabel())
  }

  const exportPdf = async () => {
    const { generateReportPdf } = await import('@/lib/report-pdf')
    generateReportPdf({
      reportType,
      reportTitle: selectedReportLabel(),
      from,
      to,
      partyName: selectedPartyName(),
      data,
      summary,
    })
  }

  const renderSummaryCards = () => {
    if (!hasRun || !summary) return null

    if (reportType === 'sales-summary' || reportType === 'gst-sales') {
      return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <Card className="p-3 shadow-none bg-blue-50/50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Total Sales</span>
              <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-lg font-bold text-blue-900 dark:text-blue-100 mt-1">
              {formatCurrency(Number(summary.total_sales || 0))}
            </p>
            <span className="text-[11px] text-blue-600 dark:text-blue-400">{summary.total_count || 0} Invoices</span>
          </Card>

          <Card className="p-3 shadow-none bg-indigo-50/50 border-indigo-200 dark:bg-indigo-950/20 dark:border-indigo-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300">Taxable Value</span>
              <Receipt className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <p className="text-lg font-bold text-indigo-900 dark:text-indigo-100 mt-1">
              {formatCurrency(Number(summary.total_taxable || 0))}
            </p>
            <span className="text-[11px] text-indigo-600 dark:text-indigo-400">
              Tax: {formatCurrency(Number(summary.total_tax || 0))}
            </span>
          </Card>

          <Card className="p-3 shadow-none bg-green-50/50 border-green-200 dark:bg-green-950/20 dark:border-green-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-green-700 dark:text-green-300">Received</span>
              <Wallet className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-lg font-bold text-green-900 dark:text-green-100 mt-1">
              {formatCurrency(Number(summary.total_received || 0))}
            </p>
            <span className="text-[11px] text-green-600 dark:text-green-400">Payment Collected</span>
          </Card>

          <Card className="p-3 shadow-none bg-amber-50/50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-amber-700 dark:text-amber-300">Outstanding</span>
              <Scale className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <p className="text-lg font-bold text-amber-900 dark:text-amber-100 mt-1">
              {formatCurrency(Number(summary.total_outstanding || 0))}
            </p>
            <span className="text-[11px] text-amber-600 dark:text-amber-400">Receivable Balance</span>
          </Card>
        </div>
      )
    }

    if (reportType === 'purchase-summary' || reportType === 'gst-purchase') {
      return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <Card className="p-3 shadow-none bg-purple-50/50 border-purple-200 dark:bg-purple-950/20 dark:border-purple-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-purple-700 dark:text-purple-300">Total Purchases</span>
              <TrendingUp className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <p className="text-lg font-bold text-purple-900 dark:text-purple-100 mt-1">
              {formatCurrency(Number(summary.total_purchases || 0))}
            </p>
            <span className="text-[11px] text-purple-600 dark:text-purple-400">{summary.total_count || 0} Bills</span>
          </Card>

          <Card className="p-3 shadow-none bg-indigo-50/50 border-indigo-200 dark:bg-indigo-950/20 dark:border-indigo-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300">Taxable Value</span>
              <Receipt className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <p className="text-lg font-bold text-indigo-900 dark:text-indigo-100 mt-1">
              {formatCurrency(Number(summary.total_taxable || 0))}
            </p>
            <span className="text-[11px] text-indigo-600 dark:text-indigo-400">
              Tax: {formatCurrency(Number(summary.total_tax || 0))}
            </span>
          </Card>

          <Card className="p-3 shadow-none bg-green-50/50 border-green-200 dark:bg-green-950/20 dark:border-green-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-green-700 dark:text-green-300">Paid Amount</span>
              <Wallet className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-lg font-bold text-green-900 dark:text-green-100 mt-1">
              {formatCurrency(Number(summary.total_paid || 0))}
            </p>
            <span className="text-[11px] text-green-600 dark:text-green-400">Payment Outflow</span>
          </Card>

          <Card className="p-3 shadow-none bg-amber-50/50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-amber-700 dark:text-amber-300">Outstanding</span>
              <Scale className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <p className="text-lg font-bold text-amber-900 dark:text-amber-100 mt-1">
              {formatCurrency(Number(summary.total_outstanding || 0))}
            </p>
            <span className="text-[11px] text-amber-600 dark:text-amber-400">Payable Balance</span>
          </Card>
        </div>
      )
    }

    if (reportType === 'customer-ledger' || reportType === 'vendor-ledger') {
      return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <Card className="p-3 shadow-none bg-blue-50/50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Total Debit</span>
              <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-lg font-bold text-blue-900 dark:text-blue-100 mt-1">
              {formatCurrency(Number(summary.total_debit || 0))}
            </p>
          </Card>

          <Card className="p-3 shadow-none bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Total Credit</span>
              <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-lg font-bold text-emerald-900 dark:text-emerald-100 mt-1">
              {formatCurrency(Number(summary.total_credit || 0))}
            </p>
          </Card>

          <Card className="p-3 shadow-none bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-800 col-span-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Closing Balance</span>
              <Scale className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-lg font-bold mt-1">
              {formatCurrency(Number(summary.closing_balance || 0))}
            </p>
          </Card>
        </div>
      )
    }

    return null
  }

  const renderTable = () => {
    if (loading) {
      return <div className="text-center py-16 text-muted-foreground text-sm">Loading report...</div>
    }
    if (!hasRun) {
      return <div className="text-center py-16 text-muted-foreground text-sm">Run the report to see results</div>
    }
    if (data.length === 0) {
      return (
        <div className="text-center py-16 text-muted-foreground text-sm">
          No records found for the selected filters
        </div>
      )
    }

    if (reportType === 'sales-summary') {
      const totalAmount = Number(summary?.total_sales) || data.reduce((s, r) => s + Number(r.totalAmount || 0), 0)
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Date</TableHead>
              <TableHead className="text-xs">Invoice No</TableHead>
              <TableHead className="text-xs">Customer Name</TableHead>
              <TableHead className="text-xs text-right">Taxable Amt</TableHead>
              <TableHead className="text-xs text-right">Tax Amt</TableHead>
              <TableHead className="text-xs text-right">Total Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row: any) => (
              <TableRow key={row.id} className="text-xs">
                <TableCell>{formatDate(row.date)}</TableCell>
                <TableCell className="font-medium font-mono">{row.invoiceNo}</TableCell>
                <TableCell>{row.customerName || row.customer?.name}</TableCell>
                <TableCell className="text-right">{formatCurrency(row.taxableAmount)}</TableCell>
                <TableCell className="text-right">{formatCurrency(row.taxAmount)}</TableCell>
                <TableCell className="text-right font-semibold">{formatCurrency(row.totalAmount)}</TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-muted/40 font-semibold text-xs border-t-2">
              <TableCell colSpan={5} className="text-right">
                Total ({data.length} invoice{data.length === 1 ? '' : 's'})
              </TableCell>
              <TableCell className="text-right">{formatCurrency(totalAmount)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )
    }

    if (reportType === 'gst-sales') {
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Date</TableHead>
              <TableHead className="text-xs">Invoice No</TableHead>
              <TableHead className="text-xs">Customer</TableHead>
              <TableHead className="text-xs">GSTIN</TableHead>
              <TableHead className="text-xs text-right">Taxable Value</TableHead>
              <TableHead className="text-xs text-right">CGST</TableHead>
              <TableHead className="text-xs text-right">SGST</TableHead>
              <TableHead className="text-xs text-right">IGST</TableHead>
              <TableHead className="text-xs text-right">Total Tax</TableHead>
              <TableHead className="text-xs text-right">Invoice Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row: any) => (
              <TableRow key={row.id} className="text-xs">
                <TableCell>{formatDate(row.date)}</TableCell>
                <TableCell className="font-medium font-mono">{row.invoiceNo}</TableCell>
                <TableCell>{row.customerName || row.customer?.name}</TableCell>
                <TableCell className="font-mono text-[11px]">{row.gstin || '-'}</TableCell>
                <TableCell className="text-right">{formatCurrency(row.taxableAmount)}</TableCell>
                <TableCell className="text-right">{formatCurrency(row.cgstAmount)}</TableCell>
                <TableCell className="text-right">{formatCurrency(row.sgstAmount)}</TableCell>
                <TableCell className="text-right">{formatCurrency(row.igstAmount)}</TableCell>
                <TableCell className="text-right">{formatCurrency(row.taxAmount)}</TableCell>
                <TableCell className="text-right font-semibold">{formatCurrency(row.totalAmount)}</TableCell>
              </TableRow>
            ))}
            {summary && (
              <TableRow className="bg-muted/40 font-semibold text-xs border-t-2">
                <TableCell colSpan={4} className="text-right">Total ({data.length} Record(s))</TableCell>
                <TableCell className="text-right">{formatCurrency(summary.total_taxable)}</TableCell>
                <TableCell className="text-right">{formatCurrency(summary.total_cgst)}</TableCell>
                <TableCell className="text-right">{formatCurrency(summary.total_sgst)}</TableCell>
                <TableCell className="text-right">{formatCurrency(summary.total_igst)}</TableCell>
                <TableCell className="text-right">{formatCurrency(summary.total_tax)}</TableCell>
                <TableCell className="text-right">{formatCurrency(summary.total_sales)}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )
    }

    if (reportType === 'purchase-summary') {
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Date</TableHead>
              <TableHead className="text-xs">Bill No</TableHead>
              <TableHead className="text-xs">Vendor</TableHead>
              <TableHead className="text-xs text-right">Taxable Amt</TableHead>
              <TableHead className="text-xs text-right">Tax Amt</TableHead>
              <TableHead className="text-xs text-right">Total Amount</TableHead>
              <TableHead className="text-xs text-right">Paid</TableHead>
              <TableHead className="text-xs text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row: any) => (
              <TableRow key={row.id} className="text-xs">
                <TableCell>{formatDate(row.date)}</TableCell>
                <TableCell className="font-medium font-mono">{row.purchaseNo}</TableCell>
                <TableCell>{row.vendorName || row.vendor?.name}</TableCell>
                <TableCell className="text-right">{formatCurrency(row.taxableAmount)}</TableCell>
                <TableCell className="text-right">{formatCurrency(row.taxAmount)}</TableCell>
                <TableCell className="text-right font-semibold">{formatCurrency(row.totalAmount)}</TableCell>
                <TableCell className="text-right text-green-600">{formatCurrency(row.paidAmount)}</TableCell>
                <TableCell className="text-right text-amber-600">{formatCurrency(row.balanceAmount)}</TableCell>
              </TableRow>
            ))}
            {summary && (
              <TableRow className="bg-muted/40 font-semibold text-xs border-t-2">
                <TableCell colSpan={3} className="text-right">Total ({data.length} Bill(s))</TableCell>
                <TableCell className="text-right">{formatCurrency(summary.total_taxable)}</TableCell>
                <TableCell className="text-right">{formatCurrency(summary.total_tax)}</TableCell>
                <TableCell className="text-right">{formatCurrency(summary.total_purchases)}</TableCell>
                <TableCell className="text-right text-green-600">{formatCurrency(summary.total_paid)}</TableCell>
                <TableCell className="text-right text-amber-600">{formatCurrency(summary.total_outstanding)}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )
    }

    if (reportType === 'gst-purchase') {
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Date</TableHead>
              <TableHead className="text-xs">Bill No</TableHead>
              <TableHead className="text-xs">Vendor</TableHead>
              <TableHead className="text-xs">GSTIN</TableHead>
              <TableHead className="text-xs text-right">Taxable Value</TableHead>
              <TableHead className="text-xs text-right">CGST</TableHead>
              <TableHead className="text-xs text-right">SGST</TableHead>
              <TableHead className="text-xs text-right">IGST</TableHead>
              <TableHead className="text-xs text-right">Total Tax</TableHead>
              <TableHead className="text-xs text-right">Bill Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row: any) => (
              <TableRow key={row.id} className="text-xs">
                <TableCell>{formatDate(row.date)}</TableCell>
                <TableCell className="font-medium font-mono">{row.purchaseNo}</TableCell>
                <TableCell>{row.vendorName || row.vendor?.name}</TableCell>
                <TableCell className="font-mono text-[11px]">{row.gstin || '-'}</TableCell>
                <TableCell className="text-right">{formatCurrency(row.taxableAmount)}</TableCell>
                <TableCell className="text-right">{formatCurrency(row.cgstAmount)}</TableCell>
                <TableCell className="text-right">{formatCurrency(row.sgstAmount)}</TableCell>
                <TableCell className="text-right">{formatCurrency(row.igstAmount)}</TableCell>
                <TableCell className="text-right">{formatCurrency(row.taxAmount)}</TableCell>
                <TableCell className="text-right font-semibold">{formatCurrency(row.totalAmount)}</TableCell>
              </TableRow>
            ))}
            {summary && (
              <TableRow className="bg-muted/40 font-semibold text-xs border-t-2">
                <TableCell colSpan={4} className="text-right">Total ({data.length} Record(s))</TableCell>
                <TableCell className="text-right">{formatCurrency(summary.total_taxable)}</TableCell>
                <TableCell className="text-right">{formatCurrency(summary.total_cgst)}</TableCell>
                <TableCell className="text-right">{formatCurrency(summary.total_sgst)}</TableCell>
                <TableCell className="text-right">{formatCurrency(summary.total_igst)}</TableCell>
                <TableCell className="text-right">{formatCurrency(summary.total_tax)}</TableCell>
                <TableCell className="text-right">{formatCurrency(summary.total_purchases)}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )
    }

    if (reportType === 'stock-report' || reportType === 'low-stock') {
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Product</TableHead>
              <TableHead className="text-xs">Description</TableHead>
              <TableHead className="text-xs">HSN/SAC</TableHead>
              <TableHead className="text-xs text-right">Current Stock</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row: any) => {
              const lowAlert = Number(row.lowStockAlert ?? 10)
              const isLow = Number(row.currentStock) <= lowAlert
              return (
                <TableRow key={row.id} className="text-xs">
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="max-w-xs truncate" title={row.description}>
                    {row.description || '-'}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{row.hsn || '-'}</TableCell>
                  <TableCell className="text-right">
                    <span className={isLow ? 'text-amber-600 font-semibold' : 'text-green-600 font-medium'}>
                      {row.currentStock}
                    </span>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )
    }

    if (reportType === 'customer-ledger') {
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Date</TableHead>
              <TableHead className="text-xs">Party Name</TableHead>
              <TableHead className="text-xs">Voucher</TableHead>
              <TableHead className="text-xs">Invoice No. / Payment ID</TableHead>
              <TableHead className="text-xs">Mode of payment / Ref No</TableHead>
              <TableHead className="text-xs text-right">Debit (₹)</TableHead>
              <TableHead className="text-xs text-right">Credit (₹)</TableHead>
              <TableHead className="text-xs text-right">Balance (₹)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row: any, idx: number) => (
              <TableRow key={row.id || idx} className="text-xs">
                <TableCell>{formatDate(row.date)}</TableCell>
                <TableCell className="font-medium">{row.partyName}</TableCell>
                <TableCell>{row.voucherType}</TableCell>
                <TableCell className="font-mono">{row.refNo}</TableCell>
                <TableCell>{row.description}</TableCell>
                <TableCell className="text-right text-blue-600 font-medium">
                  {row.debit > 0 ? formatCurrency(row.debit) : '-'}
                </TableCell>
                <TableCell className="text-right text-emerald-600 font-medium">
                  {row.credit > 0 ? formatCurrency(row.credit) : '-'}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(row.balance)}
                </TableCell>
              </TableRow>
            ))}
            {/* Total Row & Closing Bal. Row at the bottom */}
            {summary && (
              <>
                <TableRow className="bg-slate-100/90 dark:bg-slate-900/80 font-bold text-xs border-t-2 border-b-2 border-slate-900 dark:border-slate-100">
                  <TableCell colSpan={5} className="text-right font-bold text-slate-900 dark:text-slate-100 pr-4">
                    Total
                  </TableCell>
                  <TableCell className="text-right text-blue-700 dark:text-blue-400 font-bold">
                    {formatCurrency(summary.total_debit || 0)}
                  </TableCell>
                  <TableCell className="text-right text-emerald-700 dark:text-emerald-400 font-bold">
                    {formatCurrency(summary.total_credit || 0)}
                  </TableCell>
                  <TableCell className="text-right font-bold text-muted-foreground">
                    -
                  </TableCell>
                </TableRow>
                <TableRow className="bg-background font-bold text-xs border-b">
                  <TableCell colSpan={5} className="text-right font-bold text-slate-800 dark:text-slate-200 pr-4">
                    Closing Bal.
                  </TableCell>
                  <TableCell className="text-right font-medium text-muted-foreground">
                    0.00
                  </TableCell>
                  <TableCell className="text-right font-extrabold text-sm text-primary">
                    {formatCurrency(Math.abs(Number(summary.closing_balance || 0)))} {Number(summary.closing_balance || 0) >= 0 ? 'Dr' : 'Cr'}
                  </TableCell>
                  <TableCell className="text-right font-bold text-muted-foreground">
                    -
                  </TableCell>
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      )
    }

    if (reportType === 'vendor-ledger') {
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Date</TableHead>
              <TableHead className="text-xs">Party Name</TableHead>
              <TableHead className="text-xs">Voucher</TableHead>
              <TableHead className="text-xs">Bill No. / Payment ID</TableHead>
              <TableHead className="text-xs">Mode of payment / Ref No</TableHead>
              <TableHead className="text-xs text-right">Credit (₹)</TableHead>
              <TableHead className="text-xs text-right">Debit (₹)</TableHead>
              <TableHead className="text-xs text-right">Balance (₹)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row: any, idx: number) => (
              <TableRow key={row.id || idx} className="text-xs">
                <TableCell>{formatDate(row.date)}</TableCell>
                <TableCell className="font-medium">{row.partyName}</TableCell>
                <TableCell>{row.voucherType}</TableCell>
                <TableCell className="font-mono">{row.refNo}</TableCell>
                <TableCell>{row.description}</TableCell>
                <TableCell className="text-right text-emerald-600 font-medium">
                  {row.credit > 0 ? formatCurrency(row.credit) : '-'}
                </TableCell>
                <TableCell className="text-right text-blue-600 font-medium">
                  {row.debit > 0 ? formatCurrency(row.debit) : '-'}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(row.balance)}
                </TableCell>
              </TableRow>
            ))}
            {/* Total Row & Closing Bal. Row at the bottom */}
            {summary && (
              <>
                <TableRow className="bg-slate-100/90 dark:bg-slate-900/80 font-bold text-xs border-t-2 border-b-2 border-slate-900 dark:border-slate-100">
                  <TableCell colSpan={5} className="text-right font-bold text-slate-900 dark:text-slate-100 pr-4">
                    Total
                  </TableCell>
                  <TableCell className="text-right text-emerald-700 dark:text-emerald-400 font-bold">
                    {formatCurrency(summary.total_credit || 0)}
                  </TableCell>
                  <TableCell className="text-right text-blue-700 dark:text-blue-400 font-bold">
                    {formatCurrency(summary.total_debit || 0)}
                  </TableCell>
                  <TableCell className="text-right font-bold text-muted-foreground">
                    -
                  </TableCell>
                </TableRow>
                <TableRow className="bg-background font-bold text-xs border-b">
                  <TableCell colSpan={5} className="text-right font-bold text-slate-800 dark:text-slate-200 pr-4">
                    Closing Bal.
                  </TableCell>
                  <TableCell className="text-right font-medium text-muted-foreground">
                    0.00
                  </TableCell>
                  <TableCell className="text-right font-extrabold text-sm text-primary">
                    {formatCurrency(Math.abs(Number(summary.closing_balance || 0)))} {Number(summary.closing_balance || 0) >= 0 ? 'Cr' : 'Dr'}
                  </TableCell>
                  <TableCell className="text-right font-bold text-muted-foreground">
                    -
                  </TableCell>
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      )
    }

    return null
  }

  return (
    <div className="space-y-4 md:space-y-6 min-w-0">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Report Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
            <div className="space-y-1.5 min-w-0">
              <Label className="text-xs">Report Type</Label>
              <Select value={reportType} onValueChange={handleReportTypeChange}>
                <SelectTrigger className="h-9 w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map((r) => (
                    <SelectItem key={r.value} value={r.value} className="text-xs">
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isCustomerReport && (
              <div className="space-y-1.5 min-w-0">
                <Label className="text-xs">Filter Customer</Label>
                <SearchablePartySelect
                  value={partyId}
                  onValueChange={setPartyId}
                  options={customers}
                  placeholder="All Customers"
                  allOptionLabel="All Customers"
                  className="h-9 w-full text-xs"
                />
              </div>
            )}

            {isVendorReport && (
              <div className="space-y-1.5 min-w-0">
                <Label className="text-xs">Filter Vendor</Label>
                <SearchablePartySelect
                  value={partyId}
                  onValueChange={setPartyId}
                  options={vendors}
                  placeholder="All Vendors"
                  allOptionLabel="All Vendors"
                  className="h-9 w-full text-xs"
                />
              </div>
            )}

            {showDateRange && (
              <>
                <div className="space-y-1.5 min-w-0">
                  <Label className="text-xs">From Date</Label>
                  <Input
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="h-9 w-full text-xs"
                  />
                </div>
                <div className="space-y-1.5 min-w-0">
                  <Label className="text-xs">To Date</Label>
                  <Input
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="h-9 w-full text-xs"
                  />
                </div>
              </>
            )}

            <div className="flex gap-2 min-w-0 col-span-1 sm:col-span-2 lg:col-span-2 justify-end">
              <Button onClick={fetchReport} disabled={loading} className="h-9 text-xs">
                <Search className="w-3.5 h-3.5 mr-1 shrink-0" />
                <span>{loading ? 'Loading...' : 'Run Report'}</span>
              </Button>
              {hasRun && data.length > 0 && (
                <>
                  <div className={cn(exportPdfWrapClass, 'shrink-0')}>
                    <Button variant="outline" onClick={exportPdf} className={cn(exportPdfBtnClass, 'px-3 text-xs')}>
                      <FileText className="w-3.5 h-3.5 mr-1 text-indigo-600 dark:text-indigo-400" />
                      PDF (Landscape)
                    </Button>
                  </div>
                  <div className={cn(exportExcelWrapClass, 'shrink-0')}>
                    <Button variant="outline" onClick={exportExcel} className={cn(exportExcelBtnClass, 'px-3 text-xs')}>
                      <FileSpreadsheet className="w-3.5 h-3.5 mr-1 text-green-600 dark:text-emerald-400" />
                      Excel
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {renderSummaryCards()}

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {renderTable()}
        </CardContent>
      </Card>
    </div>
  )
}
