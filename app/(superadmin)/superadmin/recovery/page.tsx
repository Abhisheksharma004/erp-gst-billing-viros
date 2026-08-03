'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import {
  RotateCcw,
  Search,
  Trash2,
  FileText,
  Package,
  ShoppingCart,
  Building2,
  Eye,
  RefreshCw,
  User,
  Users,
} from 'lucide-react'
import { formatDate, cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

interface DeletedRecord {
  id: string
  organization_id: string
  organization_name?: string
  entity_type: string
  record_id: string
  reference_no?: string
  record_data: Record<string, unknown> | string
  deleted_by_user_id?: string
  deleted_by_user_name?: string
  deleted_at: string
}

interface RecoverySummary {
  total_deleted: number
  total_invoices: number
  total_purchases: number
  total_products: number
  total_parties: number
}

export default function RecoveryPage() {
  const { toast } = useToast()
  const [records, setRecords] = useState<DeletedRecord[]>([])
  const [summary, setSummary] = useState<RecoverySummary>({
    total_deleted: 0,
    total_invoices: 0,
    total_purchases: 0,
    total_products: 0,
    total_parties: 0,
  })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [entityType, setEntityType] = useState('ALL')
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  // JSON Inspector Modal state
  const [inspectRecord, setInspectRecord] = useState<DeletedRecord | null>(null)

  const fetchRecords = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set('search', search.trim())
      if (entityType && entityType !== 'ALL') params.set('entityType', entityType)

      const res = await fetch(`/api/superadmin/recovery?${params}`)
      const result = await res.json()

      if (!res.ok) {
        toast({ title: result.error || 'Failed to load recovery records', variant: 'destructive' })
        setRecords([])
        return
      }

      setRecords(Array.isArray(result.data) ? result.data : [])
      if (result.summary) {
        setSummary(result.summary)
      }
    } catch {
      toast({ title: 'Failed to load recovery records', variant: 'destructive' })
      setRecords([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecords()
  }, [entityType])

  const handleRestore = async (record: DeletedRecord) => {
    setActionLoadingId(record.id)
    try {
      const res = await fetch('/api/superadmin/recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore', id: record.id }),
      })
      const result = await res.json()

      if (!res.ok) {
        toast({ title: result.error || 'Failed to restore record', variant: 'destructive' })
        return
      }

      toast({
        title: 'Record Restored Successfully',
        description: `${record.entity_type} (${record.reference_no || record.record_id}) has been restored to active data.`,
      })
      fetchRecords()
    } catch {
      toast({ title: 'Failed to restore record', variant: 'destructive' })
    } finally {
      setActionLoadingId(null)
    }
  }

  const handlePurge = async (recordId: string) => {
    if (!confirm('Are you sure you want to permanently purge this recovery log? This cannot be undone.')) {
      return
    }

    setActionLoadingId(recordId)
    try {
      const res = await fetch(`/api/superadmin/recovery?id=${recordId}`, {
        method: 'DELETE',
      })
      const result = await res.json()

      if (!res.ok) {
        toast({ title: result.error || 'Failed to purge record', variant: 'destructive' })
        return
      }

      toast({ title: 'Record Permanently Purged' })
      fetchRecords()
    } catch {
      toast({ title: 'Failed to purge record', variant: 'destructive' })
    } finally {
      setActionLoadingId(null)
    }
  }

  const getEntityBadge = (type: string) => {
    switch (type) {
      case 'INVOICE':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
            <FileText className="h-3 w-3" />
            Invoice
          </span>
        )
      case 'PURCHASE':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-1 text-xs font-semibold text-purple-700 border border-purple-200">
            <ShoppingCart className="h-3 w-3" />
            Purchase Bill
          </span>
        )
      case 'PRODUCT':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
            <Package className="h-3 w-3" />
            Product
          </span>
        )
      case 'CUSTOMER':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800 border border-amber-200">
            <User className="h-3 w-3" />
            Customer
          </span>
        )
      case 'VENDOR':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-800 border border-teal-200">
            <Users className="h-3 w-3" />
            Vendor
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 border border-slate-200">
            {type}
          </span>
        )
    }
  }

  const formatJson = (data: Record<string, unknown> | string) => {
    if (typeof data === 'string') {
      try {
        return JSON.stringify(JSON.parse(data), null, 2)
      } catch {
        return data
      }
    }
    return JSON.stringify(data, null, 2)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <RotateCcw className="h-6 w-6 text-blue-600" />
            Data Recovery & Trash Bin
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Audit log of deleted organization records. Restore items or purge them permanently.
          </p>
        </div>
        <Button onClick={fetchRecords} variant="outline" size="sm" className="h-9 text-xs">
          <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', loading && 'animate-spin')} />
          Refresh Logs
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="p-3 shadow-none bg-blue-50/50 border-blue-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-blue-700">Total Deleted Logs</span>
            <RotateCcw className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-xl font-bold text-blue-950 mt-1">{summary.total_deleted || 0}</p>
          <span className="text-[11px] text-blue-600">Archived Records</span>
        </Card>

        <Card className="p-3 shadow-none bg-indigo-50/50 border-indigo-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-indigo-700">Invoices</span>
            <FileText className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-xl font-bold text-indigo-950 mt-1">{summary.total_invoices || 0}</p>
          <span className="text-[11px] text-indigo-600">Deleted Sales</span>
        </Card>

        <Card className="p-3 shadow-none bg-purple-50/50 border-purple-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-purple-700">Purchases</span>
            <ShoppingCart className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-xl font-bold text-purple-950 mt-1">{summary.total_purchases || 0}</p>
          <span className="text-[11px] text-purple-600">Deleted Bills</span>
        </Card>

        <Card className="p-3 shadow-none bg-emerald-50/50 border-emerald-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-700">Products</span>
            <Package className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-bold text-emerald-950 mt-1">{summary.total_products || 0}</p>
          <span className="text-[11px] text-emerald-600">Deleted Items</span>
        </Card>

        <Card className="p-3 shadow-none bg-amber-50/50 border-amber-200 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-800">Parties</span>
            <Users className="w-4 h-4 text-amber-700" />
          </div>
          <p className="text-xl font-bold text-amber-950 mt-1">{summary.total_parties || 0}</p>
          <span className="text-[11px] text-amber-700">Customers & Vendors</span>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search reference no, record ID, or org name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchRecords()}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="w-full sm:w-48">
            <Select value={entityType} onValueChange={setEntityType}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="All Entity Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-xs">All Entity Types</SelectItem>
                <SelectItem value="INVOICE" className="text-xs">Invoices</SelectItem>
                <SelectItem value="PURCHASE" className="text-xs">Purchase Bills</SelectItem>
                <SelectItem value="PRODUCT" className="text-xs">Products</SelectItem>
                <SelectItem value="CUSTOMER" className="text-xs">Customers</SelectItem>
                <SelectItem value="VENDOR" className="text-xs">Vendors</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={fetchRecords} className="h-9 text-xs w-full sm:w-auto">
            Search
          </Button>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="text-xs font-bold">Type</TableHead>
                <TableHead className="text-xs font-bold">Reference / Item</TableHead>
                <TableHead className="text-xs font-bold">Organization</TableHead>
                <TableHead className="text-xs font-bold">Deleted On</TableHead>
                <TableHead className="text-xs font-bold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-slate-500 text-xs">
                    Loading recovery logs...
                  </TableCell>
                </TableRow>
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-slate-500 text-xs">
                    No deleted records found in trash bin.
                  </TableCell>
                </TableRow>
              ) : (
                records.map((r) => (
                  <TableRow key={r.id} className="text-xs hover:bg-slate-50/80">
                    <TableCell>{getEntityBadge(r.entity_type)}</TableCell>
                    <TableCell className="font-semibold text-slate-900 font-mono">
                      {r.reference_no || r.record_id}
                    </TableCell>
                    <TableCell className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-slate-400" />
                      <span>{r.organization_name || r.organization_id}</span>
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {formatDate(r.deleted_at)}
                    </TableCell>
                    <TableCell className="text-right space-x-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setInspectRecord(r)}
                        className="h-7 px-2 text-[11px]"
                      >
                        <Eye className="h-3 w-3 mr-1 text-slate-600" />
                        Inspect
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRestore(r)}
                        disabled={actionLoadingId === r.id}
                        className="h-7 px-2 text-[11px] border-blue-300 text-blue-700 hover:bg-blue-600 hover:text-white"
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Restore
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handlePurge(r.id)}
                        disabled={actionLoadingId === r.id}
                        className="h-7 px-2 text-[11px] text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Inspect JSON Payload Modal */}
      <Dialog open={Boolean(inspectRecord)} onOpenChange={(open) => !open && setInspectRecord(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Deleted Record Payload Inspector
            </DialogTitle>
            <DialogDescription className="text-xs">
              Entity Type: <span className="font-bold text-slate-900">{inspectRecord?.entity_type}</span> | Ref: <span className="font-bold font-mono text-slate-900">{inspectRecord?.reference_no}</span>
            </DialogDescription>
          </DialogHeader>

          {inspectRecord && (
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border">
                <div>
                  <span className="text-slate-500 font-medium">Record ID:</span>{' '}
                  <span className="font-mono text-slate-900">{inspectRecord.record_id}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Deleted Date:</span>{' '}
                  <span className="text-slate-900">{formatDate(inspectRecord.deleted_at)}</span>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-700 mb-1">JSON Payload Snapshot:</p>
                <pre className="bg-slate-950 text-emerald-400 p-3 rounded-lg text-[11px] font-mono overflow-x-auto max-h-80 border">
                  {formatJson(inspectRecord.record_data)}
                </pre>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            {inspectRecord && (
              <Button
                onClick={() => {
                  const r = inspectRecord
                  setInspectRecord(null)
                  handleRestore(r)
                }}
                className="bg-blue-600 hover:bg-blue-700 text-xs"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Restore This Record Now
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
