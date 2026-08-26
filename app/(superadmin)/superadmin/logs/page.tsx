'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
} from '@/components/ui/dialog'
import {
  Activity,
  Search,
  RefreshCw,
  Clock,
  Globe,
  Monitor,
  Smartphone,
  Tablet,
  Users,
  CheckCircle2,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Info,
  Building2,
  Calendar,
  Layers,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ActivityLog {
  id: string
  userId: string
  userName: string
  userEmail: string
  userRole: string
  organizationId: string | null
  organizationName: string
  sessionId: string
  ipAddress: string
  browser: string
  os: string
  device: string
  userAgent: string
  loginAt: string
  lastActiveAt: string
  durationSeconds: number
  status: 'ACTIVE' | 'LOGGED_OUT' | 'TIMEOUT' | string
}

interface Stats {
  loginsToday: number
  onlineUsers: number
  totalUniqueUsers: number
  avgDurationSeconds: number
}

interface Pagination {
  total: number
  page: number
  limit: number
  totalPages: number
}

interface OrgOption {
  id: string
  name: string
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '< 1 min'
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hrs > 0) {
    return `${hrs}h ${mins}m ${secs}s`
  }
  if (mins > 0) {
    return `${mins}m ${secs}s`
  }
  return `${secs}s`
}

function formatTimestamp(str: string): string {
  if (!str) return '-'
  try {
    const parts = str.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/)
    if (parts) {
      const [, y, m, d, h, min, s] = parts
      const year = parseInt(y, 10)
      const monthIndex = parseInt(m, 10) - 1
      const day = parseInt(d, 10)
      let hour = parseInt(h, 10)
      const minute = min
      const second = s
      const ampm = hour >= 12 ? 'pm' : 'am'
      hour = hour % 12 || 12
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      return `${String(day).padStart(2, '0')} ${monthNames[monthIndex]} ${year}, ${String(hour).padStart(2, '0')}:${minute}:${second} ${ampm}`
    }
    const d = new Date(str)
    if (isNaN(d.getTime())) return str
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    })
  } catch {
    return str
  }
}

export default function SuperAdminLogsPage() {
  const { toast } = useToast()
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [stats, setStats] = useState<Stats>({
    loginsToday: 0,
    onlineUsers: 0,
    totalUniqueUsers: 0,
    avgDurationSeconds: 0,
  })
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  })
  const [organizations, setOrganizations] = useState<OrgOption[]>([])

  // Filters
  const [search, setSearch] = useState('')
  const [orgFilter, setOrgFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [dateRange, setDateRange] = useState('all')
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [copiedIp, setCopiedIp] = useState<string | null>(null)

  // Selected Log for detail modal
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null)
  const [copiedUa, setCopiedUa] = useState(false)

  const fetchLogs = useCallback(
    async (pageToLoad = pagination.page) => {
      setLoading(true)
      try {
        const query = new URLSearchParams({
          page: String(pageToLoad),
          limit: String(pagination.limit),
          search,
          organizationId: orgFilter,
          status: statusFilter,
          dateRange,
        })

        const res = await fetch(`/api/superadmin/activity-logs?${query.toString()}`)
        const data = await res.json().catch(() => ({}))

        if (!res.ok) {
          throw new Error(data?.error || 'Failed to fetch activity logs')
        }

        setLogs(data.logs || [])
        setStats(data.stats || { loginsToday: 0, onlineUsers: 0, totalUniqueUsers: 0, avgDurationSeconds: 0 })
        setPagination(data.pagination || { total: 0, page: 1, limit: 20, totalPages: 1 })
        if (data.organizations) {
          setOrganizations(data.organizations)
        }
      } catch (err: unknown) {
        console.error(err)
        const msg = err instanceof Error ? err.message : 'Failed to load user activity logs.'
        toast({
          title: 'Activity Logs Notice',
          description: msg,
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    },
    [pagination.page, pagination.limit, search, orgFilter, statusFilter, dateRange, toast]
  )

  useEffect(() => {
    fetchLogs(1)
  }, [search, orgFilter, statusFilter, dateRange])

  // Auto-refresh interval every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(() => {
      fetchLogs(pagination.page)
    }, 30000)
    return () => clearInterval(interval)
  }, [autoRefresh, fetchLogs, pagination.page])

  const handleCopyIp = (ip: string) => {
    navigator.clipboard.writeText(ip)
    setCopiedIp(ip)
    setTimeout(() => setCopiedIp(null), 2000)
  }

  const exportToCsv = () => {
    if (logs.length === 0) {
      toast({ title: 'No Data', description: 'No activity logs to export.' })
      return
    }

    const headers = [
      'User Name',
      'User Email',
      'Role',
      'Organisation',
      'Login Timestamp',
      'Last Active',
      'Duration (Seconds)',
      'Duration (Formatted)',
      'IP Address',
      'Browser',
      'OS',
      'Device',
      'Status',
    ]

    const rows = logs.map((l) => [
      `"${l.userName.replace(/"/g, '""')}"`,
      `"${l.userEmail.replace(/"/g, '""')}"`,
      `"${l.userRole}"`,
      `"${l.organizationName.replace(/"/g, '""')}"`,
      `"${formatTimestamp(l.loginAt)}"`,
      `"${formatTimestamp(l.lastActiveAt)}"`,
      l.durationSeconds,
      `"${formatDuration(l.durationSeconds)}"`,
      `"${l.ipAddress}"`,
      `"${l.browser}"`,
      `"${l.os}"`,
      `"${l.device}"`,
      `"${l.status}"`,
    ])

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `user_activity_logs_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)

    toast({
      title: 'Export Complete',
      description: 'Activity logs exported to CSV successfully.',
    })
  }

  const getDeviceIcon = (device: string) => {
    if (device === 'Mobile') return <Smartphone className="h-3.5 w-3.5 text-blue-500" />
    if (device === 'Tablet') return <Tablet className="h-3.5 w-3.5 text-purple-500" />
    return <Monitor className="h-3.5 w-3.5 text-slate-500" />
  }

  const getStatusBadge = (status: string) => {
    if (status === 'ACTIVE') {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Active
        </span>
      )
    }
    if (status === 'LOGGED_OUT') {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 border border-slate-200">
          <span className="h-2 w-2 rounded-full bg-slate-400" />
          Logged Out
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 border border-amber-200">
        <span className="h-2 w-2 rounded-full bg-amber-400" />
        Timed Out
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/20">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Log Activity
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Live audit trail of user logins, software usage duration, IP addresses &amp; device environments
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`text-xs h-9 font-medium ${
              autoRefresh ? 'border-emerald-300 text-emerald-700 bg-emerald-50/50' : 'text-slate-600'
            }`}
          >
            <span
              className={`mr-1.5 h-2 w-2 rounded-full ${
                autoRefresh ? 'bg-emerald-500 animate-ping' : 'bg-slate-300'
              }`}
            />
            {autoRefresh ? 'Live Auto-Sync (30s)' : 'Auto-Sync Paused'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={exportToCsv}
            className="text-xs h-9 font-medium border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5 mr-1.5 text-slate-500" />
            Export CSV
          </Button>

          <Button
            size="sm"
            onClick={() => fetchLogs(pagination.page)}
            disabled={loading}
            className="text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white shadow-xs font-semibold"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200/80 bg-white shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Online Active Users
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-extrabold text-slate-900">
                  {stats.onlineUsers}
                </span>
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                  Live Now
                </span>
              </div>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Logins Today
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-extrabold text-slate-900">
                  {stats.loginsToday}
                </span>
                <span className="text-xs font-medium text-slate-400">Sessions</span>
              </div>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <Calendar className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Avg. Software Usage
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-extrabold text-slate-900">
                  {formatDuration(stats.avgDurationSeconds)}
                </span>
                <span className="text-xs font-medium text-slate-400">/ Session</span>
              </div>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Total Unique Users
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-extrabold text-slate-900">
                  {stats.totalUniqueUsers}
                </span>
                <span className="text-xs font-medium text-slate-400">Accounts</span>
              </div>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Filter & Logs Card */}
      <Card className="border-slate-200/80 bg-white shadow-xs">
        <CardHeader className="p-5 pb-4 border-b border-slate-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-1 flex-col sm:flex-row gap-3">
              {/* Live Search */}
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by user, email, IP, browser, organisation..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-10 pl-9.5 border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white text-xs sm:text-sm"
                />
              </div>

              {/* Organization Filter */}
              <div className="w-full sm:w-48">
                <Select value={orgFilter} onValueChange={setOrgFilter}>
                  <SelectTrigger className="h-10 border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white text-xs">
                    <Building2 className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                    <SelectValue placeholder="All Organisations" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 text-xs">
                    <SelectItem value="ALL">All Organisations</SelectItem>
                    {organizations.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="w-full sm:w-36">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-10 border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white text-xs">
                    <Layers className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="ALL">All Status</SelectItem>
                    <SelectItem value="ACTIVE">🟢 Active</SelectItem>
                    <SelectItem value="LOGGED_OUT">⚪ Logged Out</SelectItem>
                    <SelectItem value="TIMEOUT">🟡 Timed Out</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range Filter */}
              <div className="w-full sm:w-36">
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="h-10 border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white text-xs">
                    <Calendar className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                    <SelectValue placeholder="Timeframe" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today Only</SelectItem>
                    <SelectItem value="7d">Last 7 Days</SelectItem>
                    <SelectItem value="30d">Last 30 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/70 border-b border-slate-100">
                <TableRow>
                  <TableHead className="font-semibold text-slate-700 py-3.5 text-xs">User Details</TableHead>
                  <TableHead className="font-semibold text-slate-700 py-3.5 text-xs">Organisation</TableHead>
                  <TableHead className="font-semibold text-slate-700 py-3.5 text-xs">Login Timestamp</TableHead>
                  <TableHead className="font-semibold text-slate-700 py-3.5 text-xs">Usage Duration</TableHead>
                  <TableHead className="font-semibold text-slate-700 py-3.5 text-xs">Browser &amp; OS</TableHead>
                  <TableHead className="font-semibold text-slate-700 py-3.5 text-xs">IP Address</TableHead>
                  <TableHead className="font-semibold text-slate-700 py-3.5 text-xs">Status</TableHead>
                  <TableHead className="font-semibold text-slate-700 py-3.5 text-xs text-right pr-4">Details</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading && logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-44 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
                        <p className="text-xs font-medium">Fetching real-time user activity logs...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-40 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Info className="h-7 w-7 text-slate-300" />
                        <p className="text-sm font-semibold text-slate-700">No activity logs found</p>
                        <p className="text-xs text-slate-400">
                          Try changing the search query, organization, or date range filter.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow
                      key={log.id}
                      className="hover:bg-blue-50/30 transition-colors border-b border-slate-100/80"
                    >
                      {/* User Info */}
                      <TableCell className="py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-[11px] font-bold text-white shadow-xs">
                            {log.userName.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 text-xs sm:text-sm truncate">
                              {log.userName}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate font-mono">
                              {log.userEmail}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Organization */}
                      <TableCell className="py-3">
                        <div>
                          <p className="text-xs font-medium text-slate-800 truncate max-w-[160px]">
                            {log.organizationName}
                          </p>
                          <Badge variant="outline" className="text-[10px] font-semibold text-slate-500 px-1.5 py-0">
                            {log.userRole}
                          </Badge>
                        </div>
                      </TableCell>

                      {/* Login Timestamp */}
                      <TableCell className="py-3">
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-slate-800">
                            {formatTimestamp(log.loginAt)}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Last Active: {formatTimestamp(log.lastActiveAt)}
                          </span>
                        </div>
                      </TableCell>

                      {/* Duration of uses */}
                      <TableCell className="py-3">
                        <div className="inline-flex items-center gap-1.5 rounded-md bg-indigo-50/90 px-2 py-1 text-xs font-bold text-indigo-700 border border-indigo-200/70 font-mono">
                          <Clock className="h-3 w-3 text-indigo-500" />
                          {formatDuration(log.durationSeconds)}
                        </div>
                      </TableCell>

                      {/* Browser & OS */}
                      <TableCell className="py-3">
                        <div className="flex items-center gap-1.5 text-xs text-slate-700">
                          {getDeviceIcon(log.device)}
                          <div>
                            <p className="font-medium text-xs leading-none text-slate-800">
                              {log.browser}
                            </p>
                            <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                              {log.os}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* IP Address */}
                      <TableCell className="py-3">
                        <div className="flex items-center gap-1.5">
                          <code className="text-xs font-mono font-medium text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {log.ipAddress}
                          </code>
                          <button
                            type="button"
                            onClick={() => handleCopyIp(log.ipAddress)}
                            aria-label="Copy IP address"
                            className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                          >
                            {copiedIp === log.ipAddress ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="py-3">
                        {getStatusBadge(log.status)}
                      </TableCell>

                      {/* Inspect Action */}
                      <TableCell className="py-3 text-right pr-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedLog(log)
                            setCopiedUa(false)
                          }}
                          className="h-8 px-2 text-xs font-medium text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                        >
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
              <p className="text-xs text-slate-500 font-medium">
                Showing <span className="font-semibold text-slate-700">{logs.length}</span> of{' '}
                <span className="font-semibold text-slate-700">{pagination.total}</span> activity sessions
              </p>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1 || loading}
                  onClick={() => fetchLogs(pagination.page - 1)}
                  className="h-8 w-8 p-0 text-slate-600 border-slate-200"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs font-semibold text-slate-700 px-2">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages || loading}
                  onClick={() => fetchLogs(pagination.page + 1)}
                  className="h-8 w-8 p-0 text-slate-600 border-slate-200"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Session Details Modal */}
      <Dialog open={Boolean(selectedLog)} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Activity className="h-5 w-5 text-blue-600" />
              Session Audit Details
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Full background telemetry collected for this user session
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4 text-xs sm:text-sm pt-2">
              <div className="grid grid-cols-2 gap-3.5 rounded-xl bg-slate-50 p-4 border border-slate-200/80">
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">User</p>
                  <p className="font-bold text-slate-900 mt-0.5">{selectedLog.userName}</p>
                  <p className="text-xs text-slate-500 font-mono">{selectedLog.userEmail}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Organisation</p>
                  <p className="font-semibold text-slate-900 mt-0.5">{selectedLog.organizationName}</p>
                  <p className="text-xs text-slate-500 font-mono">{selectedLog.organizationId || 'N/A'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="rounded-lg border border-slate-100 p-3 bg-white">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase">Login Timestamp</p>
                  <p className="font-semibold text-slate-800 mt-1 text-xs">{formatTimestamp(selectedLog.loginAt)}</p>
                </div>
                <div className="rounded-lg border border-slate-100 p-3 bg-white">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase">Last Active</p>
                  <p className="font-semibold text-slate-800 mt-1 text-xs">{formatTimestamp(selectedLog.lastActiveAt)}</p>
                </div>
                <div className="rounded-lg border border-slate-100 p-3 bg-white">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase">Usage Duration</p>
                  <p className="font-bold text-indigo-600 mt-1 text-xs font-mono">{formatDuration(selectedLog.durationSeconds)} ({selectedLog.durationSeconds}s)</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="rounded-lg border border-slate-100 p-3 bg-white">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase">IP Address</p>
                  <code className="font-bold text-slate-900 mt-1 block font-mono text-xs">{selectedLog.ipAddress}</code>
                </div>
                <div className="rounded-lg border border-slate-100 p-3 bg-white">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase">Browser &amp; OS</p>
                  <p className="font-semibold text-slate-800 mt-1 text-xs">{selectedLog.browser} on {selectedLog.os}</p>
                </div>
                <div className="rounded-lg border border-slate-100 p-3 bg-white">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase">Device Type</p>
                  <p className="font-semibold text-slate-800 mt-1 text-xs flex items-center gap-1.5">
                    {getDeviceIcon(selectedLog.device)} {selectedLog.device}
                  </p>
                </div>
              </div>

              {/* Raw User Agent Box */}
              <div className="rounded-xl border border-slate-200 bg-slate-900 text-slate-200 p-3.5">
                <div className="flex items-center justify-between pb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Raw User Agent Header</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedLog.userAgent)
                      setCopiedUa(true)
                      setTimeout(() => setCopiedUa(false), 2000)
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-400 hover:text-blue-300"
                  >
                    {copiedUa ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copiedUa ? 'Copied' : 'Copy UA'}
                  </button>
                </div>
                <p className="font-mono text-[11px] text-slate-300 break-all leading-relaxed bg-black/40 p-2 rounded">
                  {selectedLog.userAgent || 'None'}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
