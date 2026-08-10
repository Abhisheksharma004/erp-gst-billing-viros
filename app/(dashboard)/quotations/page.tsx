'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { usePageCount } from '@/hooks/use-page-count'
import { Eye, Edit, Trash2, FileText, FileCheck, Receipt, ArrowRightLeft } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ListPageToolbar } from '@/components/shared/list-page-toolbar'
import { parseJsonResponse } from '@/lib/fetch-json'
import { DocumentPdfViewer } from '@/components/shared/document-pdf-viewer'
import { Badge } from '@/components/ui/badge'

interface Quotation {
  id: string
  quotation_no: string
  date: string
  valid_until?: string
  customer_name: string
  total_amount: number
  status: string
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  DRAFT: {
    label: 'Draft',
    className: 'bg-slate-100 text-slate-700 hover:bg-slate-100 border-slate-200',
  },
  SENT: {
    label: 'Sent',
    className: 'bg-amber-50 text-amber-700 hover:bg-amber-50 border-amber-200',
  },
  ACCEPTED: {
    label: 'Accepted',
    className: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200',
  },
  REJECTED: {
    label: 'Rejected',
    className: 'bg-rose-50 text-rose-700 hover:bg-rose-50 border-rose-200',
  },
  OVERDUE: {
    label: 'Overdue',
    className: 'bg-rose-50 text-rose-700 hover:bg-rose-50 border-rose-200',
  },
  CONVERTED_TO_PROFORMA: {
    label: 'Converted to Proforma',
    className: 'bg-blue-50 text-blue-700 hover:bg-blue-50 border-blue-200',
  },
  CONVERTED_PROFORMA: {
    label: 'Converted to Proforma',
    className: 'bg-blue-50 text-blue-700 hover:bg-blue-50 border-blue-200',
  },
  CONVERTED_TO_INVOICE: {
    label: 'Converted to Invoice',
    className: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200',
  },
  CONVERTED_INVOICE: {
    label: 'Converted to Invoice',
    className: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200',
  },
  CONVERTED: {
    label: 'Converted',
    className: 'bg-blue-50 text-blue-700 hover:bg-blue-50 border-blue-200',
  },
}

function getQuotationEffectiveStatus(q: { status: string; valid_until?: string | null }): string {
  const s = (q.status || 'DRAFT').toUpperCase().trim()
  if (s.startsWith('CONVERTED') || s === 'ACCEPTED' || s === 'REJECTED') {
    return s
  }
  if (q.valid_until) {
    const validStr = typeof q.valid_until === 'string'
      ? q.valid_until.split('T')[0].split(' ')[0]
      : new Date(q.valid_until).toISOString().split('T')[0]
    const todayStr = new Date().toISOString().split('T')[0]
    if (validStr && validStr < todayStr) {
      return 'OVERDUE'
    }
  }
  return s || 'DRAFT'
}

function StatusBadge({ status }: { status: string }) {
  const normalizedKey = (status || '').toUpperCase().trim()
  const config = STATUS_CONFIG[normalizedKey] || {
    label: status ? status.replace(/_/g, ' ') : 'Draft',
    className: 'bg-slate-100 text-slate-700 hover:bg-slate-100 border-slate-200',
  }

  return (
    <Badge
      variant="outline"
      className={`${config.className} font-medium text-xs px-2.5 py-0.5 whitespace-nowrap shadow-none`}
    >
      {config.label}
    </Badge>
  )
}

function ConvertDropdown({
  id,
  size,
  icon,
}: {
  id: string
  size: string
  icon: string
}) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const updatePosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setCoords({
        top: rect.bottom + 4,
        right: Math.max(8, window.innerWidth - rect.right),
      })
    }
  }, [])

  useEffect(() => {
    if (!open) return
    updatePosition()

    const handleScrollOrResize = () => updatePosition()
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('scroll', handleScrollOrResize, true)
    window.addEventListener('resize', handleScrollOrResize)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', handleScrollOrResize, true)
      window.removeEventListener('resize', handleScrollOrResize)
    }
  }, [open, updatePosition])

  return (
    <>
      <Button
        ref={buttonRef}
        variant="ghost"
        size="icon"
        title="Convert Quotation"
        className={`${size} text-blue-600 hover:text-blue-700 hover:bg-blue-50 ${open ? 'bg-blue-100 text-blue-800' : ''}`}
        onClick={() => {
          updatePosition()
          setOpen((prev) => !prev)
        }}
      >
        <ArrowRightLeft className={icon} />
      </Button>

      {open && mounted && coords && createPortal(
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            top: `${coords.top}px`,
            right: `${coords.right}px`,
          }}
          className="w-48 rounded-lg border bg-popover p-1 shadow-2xl z-[99999] animate-in fade-in-0 zoom-in-95"
        >
          <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Convert To
          </div>
          <Link
            href={`/proformas/new?fromQuotationId=${id}`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-md px-2.5 py-2 text-xs text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <FileCheck className="h-3.5 w-3.5 text-blue-600 shrink-0" />
            <span className="font-medium">Convert to Proforma</span>
          </Link>
          <Link
            href={`/billing/new?fromQuotationId=${id}`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-md px-2.5 py-2 text-xs text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <Receipt className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span className="font-medium">Convert to Invoice</span>
          </Link>
        </div>,
        document.body
      )}
    </>
  )
}

function QuotationActions({
  id,
  onView,
  onDelete,
  compact = false,
}: {
  id: string
  onView: () => void
  onDelete: () => void
  compact?: boolean
}) {
  const size = compact ? 'h-7 w-7' : 'h-8 w-8'
  const icon = compact ? 'h-3.5 w-3.5' : 'h-4 w-4'
  return (
    <div className="flex items-center justify-end gap-0 shrink-0">
      <Button
        variant="ghost"
        size="icon"
        title="View PDF"
        className={size}
        onClick={onView}
      >
        <Eye className={icon} />
      </Button>
      <ConvertDropdown id={id} size={size} icon={icon} />
      <Link href={`/quotations/${id}/edit`}>
        <Button variant="ghost" size="icon" title="Edit" className={size}>
          <Edit className={icon} />
        </Button>
      </Link>
      <Button
        variant="ghost"
        size="icon"
        title="Delete"
        className={`${size} text-destructive hover:text-destructive`}
        onClick={onDelete}
      >
        <Trash2 className={icon} />
      </Button>
    </div>
  )
}

export default function QuotationsPage() {
  const { toast } = useToast()
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [total, setTotal] = useState(0)
  usePageCount(`${total} quotation(s)`)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table')
  const [isMobile, setIsMobile] = useState(false)
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false)
  const [pdfViewerUrl, setPdfViewerUrl] = useState<string | null>(null)
  const [pdfViewerTitle, setPdfViewerTitle] = useState('')
  const [pdfViewerFilename, setPdfViewerFilename] = useState('quotation.pdf')

  const showTable = viewMode === 'table' && !isMobile
  const showCards = viewMode === 'card' || isMobile

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  const fetchQuotations = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (search) params.set('search', search)
      const res = await fetch(`/api/quotations?${params}`)
      const data = await parseJsonResponse<{ quotations?: Quotation[]; total?: number; error?: string }>(res)
      if (!res.ok) {
        toast({ title: data.error || 'Failed to load quotations', variant: 'destructive' })
        return
      }
      setQuotations(data.quotations || [])
      setTotal(Number(data.total) || 0)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to load quotations'
      toast({ title: message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [search, page, toast])

  useEffect(() => { fetchQuotations() }, [fetchQuotations])

  const handleView = (q: Quotation) => {
    const safeName = q.quotation_no.replace(/[/\\?%*:|"<>]/g, '-')
    setPdfViewerTitle(q.quotation_no)
    setPdfViewerFilename(`${safeName}.pdf`)
    setPdfViewerUrl(`/api/quotations/${q.id}/pdf`)
    setPdfViewerOpen(true)
  }

  const handleDelete = async (id: string, quotationNo: string) => {
    if (!confirm(`Delete quotation "${quotationNo}"?`)) return
    const res = await fetch(`/api/quotations/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast({ title: 'Quotation deleted' })
      fetchQuotations()
    } else {
      const e = await parseJsonResponse<{ error?: string }>(res)
      toast({ title: e.error || 'Error', variant: 'destructive' })
    }
  }

  const Pagination = () =>
    total > 20 ? (
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border-t">
        <p className="text-sm text-muted-foreground">
          Page {page} of {Math.ceil(total / 20)}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled={page * 20 >= total} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      </div>
    ) : null

  return (
    <div className="space-y-4 md:space-y-6 min-w-0">
      <ListPageToolbar
        searchPlaceholder="Search quotations..."
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1) }}
        addLabel="New Quotation"
        addHref="/quotations/new"
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {showTable && (
        <Card className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quotation No</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Valid Until</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : quotations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    No quotations found
                  </TableCell>
                </TableRow>
              ) : (
                quotations.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="font-medium">{q.quotation_no}</TableCell>
                    <TableCell>{q.customer_name}</TableCell>
                    <TableCell>{formatDate(q.date)}</TableCell>
                    <TableCell>{q.valid_until ? formatDate(q.valid_until) : '-'}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(q.total_amount)}</TableCell>
                    <TableCell className="text-center">
                      <StatusBadge status={getQuotationEffectiveStatus(q)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <QuotationActions
                        id={q.id}
                        onView={() => handleView(q)}
                        onDelete={() => handleDelete(q.id, q.quotation_no)}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <Pagination />
        </Card>
      )}

      {showCards && (
        <div className="space-y-3">
          {loading ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">Loading...</CardContent>
            </Card>
          ) : quotations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">No quotations found</CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3 md:gap-3">
              {quotations.map((q) => (
                <Card key={q.id} className="overflow-hidden rounded-xl border shadow-sm">
                  <CardContent className="p-0">
                    <div className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm leading-snug">{q.quotation_no}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 break-words">{q.customer_name}</p>
                          </div>
                        </div>
                        <QuotationActions
                          compact
                          id={q.id}
                          onView={() => handleView(q)}
                          onDelete={() => handleDelete(q.id, q.quotation_no)}
                        />
                      </div>

                      <div className="mt-2 space-y-1.5 text-sm border-t pt-2">
                        <div className="flex justify-between gap-2">
                          <span className="text-xs text-muted-foreground">Date</span>
                          <span className="font-medium text-sm">{formatDate(q.date)}</span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-xs text-muted-foreground">Valid Until</span>
                          <span className="font-medium text-sm">
                            {q.valid_until ? formatDate(q.valid_until) : '-'}
                          </span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-xs text-muted-foreground">Amount</span>
                          <span className="font-semibold text-sm text-primary">{formatCurrency(q.total_amount)}</span>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-2 border-t pt-2.5">
                        <Link href={`/proformas/new?fromQuotationId=${q.id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full text-xs h-7 text-blue-600 border-blue-200 hover:bg-blue-50">
                            <FileCheck className="w-3.5 h-3.5 mr-1" />
                            To Proforma
                          </Button>
                        </Link>
                        <Link href={`/billing/new?fromQuotationId=${q.id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full text-xs h-7 text-emerald-600 border-emerald-200 hover:bg-emerald-50">
                            <Receipt className="w-3.5 h-3.5 mr-1" />
                            To Invoice
                          </Button>
                        </Link>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 border-t bg-muted/40 px-3 py-2.5">
                      <span className="text-xs text-muted-foreground shrink-0">Status</span>
                      <span className="ml-auto">
                        <StatusBadge status={getQuotationEffectiveStatus(q)} />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {total > 20 && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Page {page} of {Math.ceil(total / 20)}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page * 20 >= total} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <DocumentPdfViewer
        open={pdfViewerOpen}
        onOpenChange={setPdfViewerOpen}
        pdfApiUrl={pdfViewerUrl}
        title={pdfViewerTitle}
        filename={pdfViewerFilename}
      />
    </div>
  )
}
