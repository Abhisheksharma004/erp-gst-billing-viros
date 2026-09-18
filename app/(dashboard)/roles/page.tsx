'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  Plus,
  Edit,
  Trash2,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Eye,
  Search,
  Users,
  CheckCircle2,
} from 'lucide-react'
import { getInitials } from '@/lib/utils'
import { STAFF_ASSIGNABLE_MODULES } from '@/lib/permissions'

interface StaffPermission {
  id: string
  name: string
  email: string
  status: string
  role?: string
  modules?: string[]
  moduleCount?: number
  permissions?: { module: string; read: boolean; write: boolean }[]
  readCount?: number
  writeCount?: number
}

export default function RolesPage() {
  const { toast } = useToast()
  const [staffList, setStaffList] = useState<StaffPermission[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const fetchPermissions = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/staff-permissions')
      const data = await res.json()
      setStaffList(Array.isArray(data) ? data : [])
    } catch {
      toast({ title: 'Failed to load staff permissions', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchPermissions()
  }, [fetchPermissions])

  const handleDelete = async (staff: StaffPermission) => {
    if (!confirm(`Are you sure you want to revoke all permissions for ${staff.name}?`)) return
    try {
      const res = await fetch(`/api/staff-permissions/${staff.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast({ title: 'Permissions revoked successfully' })
        fetchPermissions()
      } else {
        const e = await res.json()
        toast({ title: e.error || 'Error revoking permissions', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Network error', variant: 'destructive' })
    }
  }

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    if (!search.trim()) return staffList
    const q = search.toLowerCase()
    return staffList.filter(
      (s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
    )
  }, [staffList, search])

  // Summary KPIs
  const stats = useMemo(() => {
    const total = staffList.length
    const configured = staffList.filter((s) => (s.moduleCount ?? 0) > 0).length
    const fullAccess = staffList.filter((s) => (s.writeCount ?? 0) > 0).length
    const readOnly = staffList.filter(
      (s) => (s.readCount ?? 0) > 0 && (s.writeCount ?? 0) === 0
    ).length
    return { total, configured, fullAccess, readOnly }
  }, [staffList])

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/60 shadow-sm">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Staff Permissions</h1>
            <p className="text-sm text-muted-foreground">
              Configure granular Read and Write module permissions for team members.
            </p>
          </div>
        </div>

        <Button asChild className="h-10 px-4 font-semibold shadow-sm gap-2">
          <Link href="/roles/new">
            <Plus className="w-4 h-4" />
            Assign Permissions
          </Link>
        </Button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs text-muted-foreground font-medium">Total Staff</span>
              <p className="text-2xl font-bold text-foreground tabular-nums">{stats.total}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs text-muted-foreground font-medium">Configured</span>
              <p className="text-2xl font-bold text-primary tabular-nums">{stats.configured}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs text-muted-foreground font-medium">Read & Write Access</span>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {stats.fullAccess}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs text-muted-foreground font-medium">Read-Only Staff</span>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                {stats.readOnly}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
              <Eye className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search staff by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-background border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Staff Permissions Table */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <TableHead className="py-3.5 px-4 sm:px-6">Employee</TableHead>
              <TableHead className="py-3.5 px-4">Status</TableHead>
              <TableHead className="py-3.5 px-4">Read Access</TableHead>
              <TableHead className="py-3.5 px-4">Write Access</TableHead>
              <TableHead className="py-3.5 px-4 sm:px-6 text-right">Actions</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-16 text-muted-foreground">
                  <div className="inline-flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span>Loading permissions...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredStaff.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-16 text-muted-foreground">
                  <div className="max-w-sm mx-auto space-y-3">
                    <ShieldAlert className="w-10 h-10 text-muted-foreground/50 mx-auto" />
                    <p className="text-sm font-medium">No staff members found.</p>
                    <p className="text-xs text-muted-foreground">
                      Add team members under Staff Management first, then assign permissions.
                    </p>
                    <Button asChild size="sm" variant="outline">
                      <Link href="/roles/new">
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        Assign Permissions
                      </Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredStaff.map((s) => {
                const readCount = s.readCount ?? (s.moduleCount ?? 0)
                const writeCount = s.writeCount ?? (s.moduleCount ?? 0)
                const totalModules = STAFF_ASSIGNABLE_MODULES.length
                const hasAny = readCount > 0 || writeCount > 0

                return (
                  <TableRow
                    key={s.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-900/30 transition-colors"
                  >
                    {/* Employee Info */}
                    <TableCell className="py-4 px-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                          {getInitials(s.name)}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground text-sm leading-tight">{s.name}</p>
                          <p className="text-xs text-muted-foreground">{s.email}</p>
                        </div>
                      </div>
                    </TableCell>

                    {/* Status */}
                    <TableCell className="py-4 px-4">
                      <Badge
                        variant={s.status === 'ACTIVE' ? 'default' : 'secondary'}
                        className="text-[11px] font-semibold"
                      >
                        {s.status}
                      </Badge>
                    </TableCell>

                    {/* Read Access Count */}
                    <TableCell className="py-4 px-4">
                      {readCount > 0 ? (
                        <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800 text-xs font-medium gap-1">
                          <Eye className="w-3 h-3" />
                          {readCount} of {totalModules} modules
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                    </TableCell>

                    {/* Write Access Count */}
                    <TableCell className="py-4 px-4">
                      {writeCount > 0 ? (
                        <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-xs font-medium gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          {writeCount} of {totalModules} modules
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="py-4 px-4 sm:px-6 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button asChild variant="outline" size="sm" className="h-8 text-xs font-medium gap-1.5">
                          <Link href={`/roles/${s.id}`}>
                            <Edit className="w-3.5 h-3.5" />
                            {hasAny ? 'Edit Permissions' : 'Configure'}
                          </Link>
                        </Button>
                        {hasAny && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Revoke all permissions"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors"
                            onClick={() => handleDelete(s)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
