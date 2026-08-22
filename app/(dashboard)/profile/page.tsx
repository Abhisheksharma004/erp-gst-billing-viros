'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import {
  Loader2, Mail, Phone, Building2, Shield, Calendar, KeyRound, Eye, EyeOff,
  UserCheck, CheckCircle2, Copy, Check, Fingerprint
} from 'lucide-react'
import { formatDate, getInitials } from '@/lib/utils'
import { formatModuleLabel } from '@/lib/permissions'
import { changePasswordSchema } from '@/lib/validations'
import { z } from 'zod'

type ChangePasswordInput = z.infer<typeof changePasswordSchema>

interface ProfileData {
  id: string
  name: string
  email: string
  mobile?: string | null
  role: string
  status: string
  branch?: string | null
  avatar?: string | null
  organizationId?: string | null
  createdAt: string
  updatedAt: string
  modules: string[]
}

function InfoTile({
  icon: Icon,
  label,
  value,
  colorClass,
  canCopy = false,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  colorClass: string
  canCopy?: boolean
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (!value || value === '—') return
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm transition-all hover:shadow-md hover:border-slate-200 dark:hover:border-slate-700">
      <div className="flex items-center gap-3.5 min-w-0">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${colorClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate mt-0.5">
            {value}
          </p>
        </div>
      </div>
      {canCopy && value !== '—' && (
        <button
          type="button"
          onClick={handleCopy}
          className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
          title="Copy value"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
        </button>
      )}
    </div>
  )
}

export default function ProfilePage() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const passwordForm = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => r.json())
      .then((data) => {
        if (data?.id) setProfile(data)
      })
      .finally(() => setLoading(false))
  }, [])

  const onPasswordSubmit = async (data: ChangePasswordInput) => {
    setSaving(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Failed to update password')

      toast({ title: 'Password changed successfully' })
      passwordForm.reset()
      setPasswordOpen(false)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Error'
      toast({ title: message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-muted-foreground gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        <span className="text-sm font-medium">Loading profile details...</span>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        Could not load profile. Please refresh the page.
      </div>
    )
  }

  const displayName = profile.name || session?.user?.name || 'User'

  return (
    <div className="space-y-6 max-w-4xl pb-8">
      {/* Header Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          User Profile
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage your account credentials, branch details, and access permissions
        </p>
      </div>

      {/* Hero Header Card */}
      <div className="relative rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-6 md:p-8 text-white shadow-xl overflow-hidden border border-slate-800">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {profile.avatar ? (
            <img
              src={profile.avatar}
              alt={displayName}
              className="h-24 w-24 rounded-2xl object-cover border-2 border-white/20 shadow-xl shrink-0"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-3xl font-bold shadow-xl border border-white/20 shrink-0">
              {getInitials(displayName)}
            </div>
          )}

          <div className="text-center sm:text-left flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-white">{displayName}</h2>
                <p className="text-sm text-blue-200/80 mt-1 flex items-center justify-center sm:justify-start gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-blue-300" />
                  {profile.email}
                </p>
              </div>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-9 px-4 gap-2 font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm self-center sm:self-auto"
                onClick={() => setPasswordOpen(true)}
              >
                <KeyRound className="h-4 w-4 text-blue-300" />
                Change Password
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 mt-4 pt-4 border-t border-white/10">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                <UserCheck className="h-3.5 w-3.5" />
                {profile.role}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                {profile.status}
              </span>
              {profile.organizationId && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  <Fingerprint className="h-3.5 w-3.5" />
                  Org ID: {profile.organizationId}
                </span>
              )}
              {profile.branch && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-400/30">
                  <Building2 className="h-3.5 w-3.5" />
                  Branch: {profile.branch}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Account Information Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Shield className="h-4 w-4 text-blue-600" />
            Account Details & Info
          </CardTitle>
          <CardDescription>Primary communication and account metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoTile
              icon={Mail}
              label="Email Address"
              value={profile.email}
              colorClass="bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"
              canCopy
            />
            <InfoTile
              icon={Phone}
              label="Mobile Number"
              value={profile.mobile || '—'}
              colorClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"
              canCopy
            />
            <InfoTile
              icon={Fingerprint}
              label="Organisation ID"
              value={profile.organizationId || '—'}
              colorClass="bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"
              canCopy
            />
            <InfoTile
              icon={Building2}
              label="Assigned Branch"
              value={profile.branch || 'Main Branch'}
              colorClass="bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400"
            />
            <InfoTile
              icon={Shield}
              label="System Role"
              value={profile.role}
              colorClass="bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"
            />
            <InfoTile
              icon={Calendar}
              label="Member Since"
              value={formatDate(profile.createdAt)}
              colorClass="bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400"
            />
          </div>
        </CardContent>
      </Card>

      {/* System Access & Module Permissions */}
      {profile.role === 'STAFF' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-600" />
              Assigned Module Access
            </CardTitle>
            <CardDescription>Modules and features enabled for your account</CardDescription>
          </CardHeader>
          <CardContent>
            {profile.modules.length === 0 ? (
              <p className="text-sm text-muted-foreground">No specific modules assigned yet. Please contact your administrator.</p>
            ) : (
              <div className="flex flex-wrap gap-2.5">
                {profile.modules.map((mod) => (
                  <Badge key={mod} variant="secondary" className="px-3 py-1 text-xs font-semibold bg-slate-100 dark:bg-slate-800">
                    {formatModuleLabel(mod)}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {profile.role === 'ADMIN' && (
        <Card className="border-blue-100 bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/30 dark:border-blue-900/40 dark:from-blue-950/20 dark:to-transparent">
          <CardHeader>
            <CardTitle className="text-base font-bold text-blue-900 dark:text-blue-300 flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-600" />
              Full Administrator Privilege
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              You are signed in as an <strong className="text-blue-700 dark:text-blue-400">Admin</strong>. Your account has full authorization to manage invoices, payments, inventories, staff roles, and business settings.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Change Password Dialog */}
      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <KeyRound className="h-5 w-5 text-blue-600" />
              Change Account Password
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrent ? 'text' : 'password'}
                  className="pr-10"
                  placeholder="Enter current password"
                  {...passwordForm.register('currentPassword')}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowCurrent(!showCurrent)}
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordForm.formState.errors.currentPassword && (
                <p className="text-destructive text-xs">
                  {passwordForm.formState.errors.currentPassword.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNew ? 'text' : 'password'}
                  className="pr-10"
                  placeholder="Enter new password"
                  {...passwordForm.register('newPassword')}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowNew(!showNew)}
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordForm.formState.errors.newPassword && (
                <p className="text-destructive text-xs">
                  {passwordForm.formState.errors.newPassword.message}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground">
                Must contain letters, numbers, and special characters (min. 8 characters).
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  className="pr-10"
                  placeholder="Re-enter new password"
                  {...passwordForm.register('confirmPassword')}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowConfirm(!showConfirm)}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordForm.formState.errors.confirmPassword && (
                <p className="text-destructive text-xs">
                  {passwordForm.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setPasswordOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Password'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

