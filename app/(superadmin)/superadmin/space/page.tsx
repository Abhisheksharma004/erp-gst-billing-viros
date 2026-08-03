'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import {
  Database,
  HardDrive,
  RefreshCw,
  Search,
  PieChart as PieChartIcon,
  Layers,
  FileText,
  Package,
  ShoppingCart,
  Users,
  Building,
  Shield,
  BarChart3,
  Server,
  FileSpreadsheet,
} from 'lucide-react'
import {
  PieChart as RePieChart,
  Pie,
  Cell,
  Tooltip as ReTooltip,
  ResponsiveContainer,
} from 'recharts'

interface CategoryBreakdown {
  invoicesAndSalesBytes: number
  inventoryAndProductsBytes: number
  purchasesAndVendorsBytes: number
  customersBytes: number
  settingsAndMediaBytes: number
  membersAndSystemBytes: number
}

interface OrgSpaceUsage {
  id: string
  name: string
  slug: string
  status: string
  plan: string
  ownerName: string | null
  ownerEmail: string | null
  createdAt: string
  totalBytes: number
  formattedSize: string
  percentageOfTotal: number
  totalRecords: number
  breakdown: CategoryBreakdown
}

interface SpaceSummary {
  totalDatabaseSizeBytes: number
  formattedTotalDatabaseSize: string
  totalDataSizeBytes: number
  formattedTotalDataSize: string
  totalIndexSizeBytes: number
  formattedTotalIndexSize: string
  totalTenantSizeBytes: number
  formattedTotalTenantSize: string
  systemOverheadBytes: number
  formattedSystemOverheadSize: string
  totalOrganizationsCount: number
  averageSpacePerOrgBytes: number
  formattedAverageSpacePerOrg: string
  totalDbRows: number
  highestConsumer: {
    id: string
    name: string
    formattedSize: string
    percentage: number
  } | null
}

interface TableMeta {
  tableName: string
  tableRows: number
  dataLength: number
  indexLength: number
  totalLength: number
  avgRowBytes: number
  formattedTotalLength: string
}

const PIE_COLORS = [
  '#2563eb', // Blue
  '#10b981', // Emerald
  '#9333ea', // Purple
  '#f59e0b', // Amber
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#94a3b8', // Slate for system/other
]

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const val = bytes / Math.pow(k, i)
  return `${val < 10 ? val.toFixed(2) : val.toFixed(1)} ${sizes[i]}`
}

function CustomPieTooltip({
  active,
  payload,
}: {
  active?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[];
}) {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="rounded-lg border bg-white p-3 shadow-lg text-xs font-sans space-y-1 border-slate-200 z-50">
        <p className="font-semibold text-slate-900 border-b pb-1 mb-1">{data.name}</p>
        <p className="text-slate-600 flex justify-between gap-3">
          <span>Memory Occupied:</span>
          <span className="font-mono font-bold text-blue-700">{data.formattedSize}</span>
        </p>
        <p className="text-slate-600 flex justify-between gap-3">
          <span>Database Share:</span>
          <span className="font-mono font-bold text-slate-900">{data.percentage}%</span>
        </p>
      </div>
    )
  }
  return null
}

function DetailStorageRow({
  icon: Icon,
  label,
  bytes,
  totalBytes,
  color,
}: {
  icon: React.ElementType
  label: string
  bytes: number
  totalBytes: number
  color: string
}) {
  const pct = totalBytes > 0 ? (bytes / totalBytes) * 100 : 0
  return (
    <div className="space-y-1 py-2 border-b border-slate-100 last:border-0">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-slate-500" />
          <span className="font-medium text-slate-700">{label}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 font-mono">{pct.toFixed(1)}%</span>
          <span className="font-semibold text-slate-900 font-mono">{formatBytes(bytes)}</span>
        </div>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-300`}
          style={{ width: `${Math.min(100, Math.max(1, pct))}%` }}
        />
      </div>
    </div>
  )
}

export default function SuperAdminSpacePage() {
  const { toast } = useToast()
  const [summary, setSummary] = useState<SpaceSummary | null>(null)
  const [orgs, setOrgs] = useState<OrgSpaceUsage[]>([])
  const [tables, setTables] = useState<TableMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('all')
  const [sortBy, setSortBy] = useState<'size_desc' | 'size_asc' | 'records_desc' | 'name'>('size_desc')
  const [selectedOrg, setSelectedOrg] = useState<OrgSpaceUsage | null>(null)
  const [showTablesModal, setShowTablesModal] = useState(false)

  const fetchSpaceData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/superadmin/space')
      if (!res.ok) throw new Error('Failed to fetch space metrics')
      const data = await res.json()
      setSummary(data.summary)
      setOrgs(Array.isArray(data.organizations) ? data.organizations : [])
      setTables(Array.isArray(data.tables) ? data.tables : [])
    } catch {
      toast({
        title: 'Error',
        description: 'Could not load database space metrics',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchSpaceData()
  }, [fetchSpaceData])

  const filteredOrgs = orgs
    .filter((org) => {
      const matchesSearch =
        org.name.toLowerCase().includes(search.toLowerCase()) ||
        org.slug.toLowerCase().includes(search.toLowerCase()) ||
        org.id.toLowerCase().includes(search.toLowerCase())
      const matchesPlan = planFilter === 'all' || org.plan.toLowerCase() === planFilter.toLowerCase()
      return matchesSearch && matchesPlan
    })
    .sort((a, b) => {
      if (sortBy === 'size_desc') return b.totalBytes - a.totalBytes
      if (sortBy === 'size_asc') return a.totalBytes - b.totalBytes
      if (sortBy === 'records_desc') return b.totalRecords - a.totalRecords
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      return 0
    })

  // Prepare Pie Chart Data
  const topOrgs = orgs.slice(0, 5)
  const topOrgsPercentageSum = topOrgs.reduce((sum, o) => sum + o.percentageOfTotal, 0)
  const otherOrgsBytes = orgs.slice(5).reduce((sum, o) => sum + o.totalBytes, 0)
  const systemAndOtherBytes = (summary?.systemOverheadBytes ?? 0) + otherOrgsBytes
  const otherPercentage = Number(Math.max(0, 100 - topOrgsPercentageSum).toFixed(2))

  const pieChartData = [
    ...topOrgs.map((org) => ({
      name: org.name,
      value: Math.max(1, org.totalBytes),
      formattedSize: org.formattedSize,
      percentage: org.percentageOfTotal,
    })),
    {
      name: 'Other & System Tables',
      value: Math.max(1, systemAndOtherBytes),
      formattedSize: formatBytes(systemAndOtherBytes),
      percentage: otherPercentage,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header Title */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Database className="h-6 w-6 text-blue-600" />
            Database Space & Storage Tracker
          </h2>
          <p className="text-sm text-slate-500">
            Real-time breakdown of database memory occupation per organization and schema overhead
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowTablesModal(true)}>
            <Server className="h-4 w-4 mr-1.5 text-slate-600" />
            Table Allocations
          </Button>
          <Button variant="outline" size="sm" onClick={fetchSpaceData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-l-4 border-l-blue-600">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Database Size</CardTitle>
            <HardDrive className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900">
              {loading ? '—' : summary?.formattedTotalDatabaseSize ?? '0 B'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Data: {summary?.formattedTotalDataSize ?? '0 B'} · Indexes: {summary?.formattedTotalIndexSize ?? '0 B'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-600">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Tenant Data Used</CardTitle>
            <PieChartIcon className="h-5 w-5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900">
              {loading ? '—' : summary?.formattedTotalTenantSize ?? '0 B'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Across {summary?.totalOrganizationsCount ?? 0} active organizations
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-600">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Avg Space / Org</CardTitle>
            <BarChart3 className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900">
              {loading ? '—' : summary?.formattedAverageSpacePerOrg ?? '0 B'}
            </p>
            <p className="text-xs text-slate-500 mt-1">Average per registered tenant</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-600">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Top Storage Consumer</CardTitle>
            <Layers className="h-5 w-5 text-amber-600" />
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold text-slate-900 truncate">
              {loading
                ? '—'
                : summary?.highestConsumer
                ? summary.highestConsumer.name
                : 'No Data'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {summary?.highestConsumer
                ? `${summary.highestConsumer.formattedSize} (${summary.highestConsumer.percentage}% of DB)`
                : 'N/A'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Storage Memory Distribution — Exclusively Pie Chart View */}
      {!loading && summary && (
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <PieChartIcon className="h-5 w-5 text-blue-600" />
                Platform Memory Distribution
              </CardTitle>
              <span className="text-xs font-mono font-normal text-slate-500">
                Total Rows: {summary.totalDbRows.toLocaleString()}
              </span>
            </div>
          </CardHeader>

          <CardContent className="pt-2">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              {/* Donut / Pie Chart */}
              <div className="md:col-span-5 relative flex justify-center items-center h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                          stroke="#ffffff"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <ReTooltip content={<CustomPieTooltip />} />
                  </RePieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <p className="text-xs text-slate-500 font-medium">Total Database</p>
                  <p className="text-lg font-bold text-slate-900 font-mono">
                    {summary.formattedTotalDatabaseSize}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {summary.totalDbRows.toLocaleString()} rows
                  </p>
                </div>
              </div>

              {/* Pie Chart Legend List */}
              <div className="md:col-span-7 space-y-2.5">
                {pieChartData.map((item, index) => {
                  const color = PIE_COLORS[index % PIE_COLORS.length]
                  return (
                    <div
                      key={item.name}
                      className="flex items-center justify-between p-2 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors text-sm"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <span
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span className="font-medium text-slate-800 truncate" title={item.name}>
                          {item.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-mono font-bold text-slate-900">
                          {item.formattedSize}
                        </span>
                        <Badge
                          variant="secondary"
                          className="font-mono text-xs px-2 py-0.5 bg-slate-100 text-slate-700"
                        >
                          {item.percentage}%
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Table Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">
              Organizations Memory Occupation ({filteredOrgs.length})
            </CardTitle>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search org name, slug, ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-56"
                />
              </div>

              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plans</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="size_desc">Largest Space</SelectItem>
                  <SelectItem value="size_asc">Smallest Space</SelectItem>
                  <SelectItem value="records_desc">Highest Records</SelectItem>
                  <SelectItem value="name">Org Name (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="[&>th]:py-2.5 [&>th]:px-3">
                <TableHead>Organization</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Total Records</TableHead>
                <TableHead>Memory Occupied</TableHead>
                <TableHead className="w-48">% Share of DB</TableHead>
                <TableHead className="text-right pr-4">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-slate-500">
                    Calculating database space allocation...
                  </TableCell>
                </TableRow>
              ) : filteredOrgs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-slate-500">
                    No organizations match your filter
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrgs.map((org) => (
                  <TableRow key={org.id} className="[&>td]:py-2.5 [&>td]:px-3">
                    <TableCell>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{org.name}</p>
                        <p className="text-xs text-slate-500 font-mono">
                          ID: {org.id} {org.ownerEmail ? `· ${org.ownerEmail}` : ''}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {org.plan}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{org.totalRecords.toLocaleString()}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono font-semibold text-blue-700">
                        {org.formattedSize}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span>{org.percentageOfTotal}%</span>
                        </div>
                        <Progress value={Math.max(1, org.percentageOfTotal)} className="h-2" />
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => setSelectedOrg(org)}
                      >
                        <PieChartIcon className="h-4 w-4 mr-1.5" />
                        Storage Breakdown
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Storage Breakdown Modal */}
      <Dialog open={!!selectedOrg} onOpenChange={(open) => !open && setSelectedOrg(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <HardDrive className="h-5 w-5 text-blue-600" />
              Storage Breakdown — {selectedOrg?.name}
            </DialogTitle>
            <p className="text-xs text-slate-500 font-mono">
              Total Space: {selectedOrg?.formattedSize} ({selectedOrg?.percentageOfTotal}% of DB) · {selectedOrg?.totalRecords.toLocaleString()} Total Records
            </p>
          </DialogHeader>

          {selectedOrg && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border bg-slate-50 p-4 space-y-1">
                <DetailStorageRow
                  icon={FileText}
                  label="Invoices, Quotations & Challans"
                  bytes={selectedOrg.breakdown.invoicesAndSalesBytes}
                  totalBytes={selectedOrg.totalBytes}
                  color="bg-blue-600"
                />
                <DetailStorageRow
                  icon={Package}
                  label="Inventory, Products & Movements"
                  bytes={selectedOrg.breakdown.inventoryAndProductsBytes}
                  totalBytes={selectedOrg.totalBytes}
                  color="bg-emerald-500"
                />
                <DetailStorageRow
                  icon={ShoppingCart}
                  label="Purchases, POs & Vendors"
                  bytes={selectedOrg.breakdown.purchasesAndVendorsBytes}
                  totalBytes={selectedOrg.totalBytes}
                  color="bg-purple-600"
                />
                <DetailStorageRow
                  icon={Users}
                  label="Customers Database"
                  bytes={selectedOrg.breakdown.customersBytes}
                  totalBytes={selectedOrg.totalBytes}
                  color="bg-cyan-500"
                />
                <DetailStorageRow
                  icon={Building}
                  label="Business Settings & Media Logos"
                  bytes={selectedOrg.breakdown.settingsAndMediaBytes}
                  totalBytes={selectedOrg.totalBytes}
                  color="bg-amber-500"
                />
                <DetailStorageRow
                  icon={Shield}
                  label="Members, Roles & Permissions"
                  bytes={selectedOrg.breakdown.membersAndSystemBytes}
                  totalBytes={selectedOrg.totalBytes}
                  color="bg-indigo-500"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedOrg(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schema Tables Modal */}
      <Dialog open={showTablesModal} onOpenChange={setShowTablesModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-blue-600" />
              Database Table Allocations ({tables.length} Tables)
            </DialogTitle>
            <p className="text-xs text-slate-500">
              Low-level MySQL table size allocation from information_schema
            </p>
          </DialogHeader>

          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Table Name</TableHead>
                  <TableHead>Estimated Rows</TableHead>
                  <TableHead>Data Size</TableHead>
                  <TableHead>Index Size</TableHead>
                  <TableHead className="text-right">Total Size</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tables.map((t) => (
                  <TableRow key={t.tableName}>
                    <TableCell className="font-mono text-xs font-semibold text-slate-900">
                      {t.tableName}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{t.tableRows.toLocaleString()}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-600">
                      {formatBytes(t.dataLength)}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-600">
                      {formatBytes(t.indexLength)}
                    </TableCell>
                    <TableCell className="font-mono text-xs font-bold text-blue-700 text-right">
                      {t.formattedTotalLength}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTablesModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
