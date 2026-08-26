'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { registerSchema, RegisterInput } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { ConsoleMessage, CONSOLE_MESSAGE_DURATION_MS } from '@/components/shared/console-message'
import { useConsoleMessage } from '@/hooks/use-console-message'
import { useToast } from '@/hooks/use-toast'
import { sanitizeGstinInput, sanitizeMobileInput } from '@/lib/field-validation'
import { INDIAN_STATES } from '@/lib/utils'
import {
  Loader2,
  Eye,
  EyeOff,
  Building2,
  User,
  Clock,
  Phone,
  Mail,
  Lock,
  MapPin,
  FileText,
  ShieldCheck,
  Check,
} from 'lucide-react'
import Link from 'next/link'
import {
  ORG_APPROVAL_NOTICE,
  ORG_APPROVAL_SUCCESS,
} from '@/lib/registration-messages'

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs font-medium text-destructive mt-1 animate-in fade-in-50">{message}</p>
}

interface RegisterFormProps {
  onSuccess?: () => void
  onSignInClick?: () => void
}

function formatRegisterError(error: unknown): string {
  if (Array.isArray(error)) {
    return error
      .map((e: { message?: string }) => e.message)
      .filter(Boolean)
      .join(', ')
  }
  if (typeof error === 'string' && error.trim()) return error
  return 'Registration failed. Please check your details and try again.'
}

export function RegisterForm({ onSuccess, onSignInClick }: RegisterFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { message, showSuccess, showError, clearMessage } = useConsoleMessage()

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      organizationName: '',
      phone: '',
      address: '',
      gstin: '',
      state: '',
      pincode: '',
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false as unknown as true,
    },
  })

  const passwordVal = form.watch('password') || ''
  const hasMinLength = passwordVal.length >= 8
  const hasLetter = /[a-zA-Z]/.test(passwordVal)
  const hasNumber = /[0-9]/.test(passwordVal)
  const hasSpecial = /[^a-zA-Z0-9]/.test(passwordVal)

  const onSubmit = async (data: RegisterInput) => {
    setLoading(true)
    clearMessage()
    setSubmitError(null)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      let result: { error?: unknown; message?: string } = {}
      try {
        result = await res.json()
      } catch {
        throw new Error('Invalid server response. Please try again.')
      }

      if (!res.ok) {
        const errMsg = formatRegisterError(result.error)
        setSubmitError(errMsg)
        showError(errMsg)
        toast({ title: 'Registration failed', description: errMsg, variant: 'destructive' })
        return
      }

      showSuccess(ORG_APPROVAL_SUCCESS)
      toast({
        title: 'Registration submitted',
        description: ORG_APPROVAL_SUCCESS,
      })

      if (onSuccess) {
        setTimeout(onSuccess, CONSOLE_MESSAGE_DURATION_MS)
      } else {
        setTimeout(() => router.replace('/login?pending=1'), CONSOLE_MESSAGE_DURATION_MS)
      }
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : 'Registration failed. Please try again.'
      setSubmitError(errMsg)
      showError(errMsg)
      toast({ title: 'Registration failed', description: errMsg, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const clearOnChange = () => {
    clearMessage()
    setSubmitError(null)
  }

  return (
    <form
      method="post"
      action="/register"
      noValidate
      className="flex min-h-full flex-col"
      onSubmit={(e) => {
        e.preventDefault()
        void form.handleSubmit(onSubmit)(e)
      }}
    >
      <div className="flex-1 space-y-7 px-5 py-6 sm:px-8 sm:py-8">
        {message && <ConsoleMessage type={message.type} text={message.text} />}

        {/* SECTION 1: ORGANISATION DETAILS */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 pb-2.5 border-b border-slate-200">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
              <Building2 className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">1. Organisation Details</h2>
              <p className="text-xs text-slate-500">Business information for invoices, billing, and GST compliance</p>
            </div>
          </div>

          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="organizationName" className="text-xs font-semibold text-slate-700">
                Organisation Name <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <Input
                  id="organizationName"
                  placeholder="Your company / business name"
                  className="h-10 !pl-11 border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors"
                  {...form.register('organizationName', { onChange: clearOnChange })}
                />
              </div>
              <FieldError message={form.formState.errors.organizationName?.message} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-semibold text-slate-700">
                  Business Mobile / Phone <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <Controller
                    name="phone"
                    control={form.control}
                    render={({ field }) => (
                      <Input
                        id="phone"
                        inputMode="numeric"
                        placeholder="10-digit mobile"
                        maxLength={10}
                        value={field.value}
                        className="h-10 !pl-11 border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors"
                        onChange={(e) => {
                          clearOnChange()
                          field.onChange(sanitizeMobileInput(e.target.value))
                        }}
                      />
                    )}
                  />
                </div>
                <FieldError message={form.formState.errors.phone?.message} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="gstin" className="text-xs font-semibold text-slate-700">
                  GSTIN <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <Controller
                    name="gstin"
                    control={form.control}
                    render={({ field }) => (
                      <Input
                        id="gstin"
                        placeholder="15-digit GSTIN (e.g. 27AAAAA0000A1Z5)"
                        maxLength={15}
                        value={field.value || ''}
                        className="h-10 !pl-11 uppercase font-mono text-xs sm:text-sm border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors"
                        onChange={(e) => {
                          clearOnChange()
                          field.onChange(sanitizeGstinInput(e.target.value))
                        }}
                      />
                    )}
                  />
                </div>
                <FieldError message={form.formState.errors.gstin?.message} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="address" className="text-xs font-semibold text-slate-700">
                Registered Address <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                <Textarea
                  id="address"
                  rows={2}
                  placeholder="Shop/Office No., Street, Landmark, Area"
                  className="!pl-11 resize-none min-h-[64px] border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors text-sm"
                  {...form.register('address', { onChange: clearOnChange })}
                />
              </div>
              <FieldError message={form.formState.errors.address?.message} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  State <span className="text-destructive">*</span>
                </Label>
                <Controller
                  name="state"
                  control={form.control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(v) => {
                        clearOnChange()
                        field.onChange(v)
                        if (form.getValues('gstin')) {
                          form.trigger('gstin')
                        }
                      }}
                    >
                      <SelectTrigger className="h-10 border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:ring-2 focus:ring-blue-500 transition-colors">
                        <SelectValue placeholder="Select business state" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {INDIAN_STATES.map((s) => (
                          <SelectItem key={s.code} value={s.name}>
                            {s.name} ({s.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError message={form.formState.errors.state?.message} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pincode" className="text-xs font-semibold text-slate-700">
                  Pincode <span className="text-destructive">*</span>
                </Label>
                <Controller
                  name="pincode"
                  control={form.control}
                  render={({ field }) => (
                    <Input
                      id="pincode"
                      inputMode="numeric"
                      placeholder="6-digit pincode"
                      maxLength={6}
                      value={field.value}
                      className="h-10 border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors"
                      onChange={(e) => {
                        clearOnChange()
                        field.onChange(e.target.value.replace(/\D/g, '').slice(0, 6))
                      }}
                    />
                  )}
                />
                <FieldError message={form.formState.errors.pincode?.message} />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: ADMINISTRATOR & ACCOUNT DETAILS */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 pb-2.5 border-b border-slate-200">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
              <User className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">2. Account Details</h2>
              <p className="text-xs text-slate-500">Administrator credentials to manage billing, team &amp; settings</p>
            </div>
          </div>

          <div className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-semibold text-slate-700">
                  Your Full Name <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <Input
                    id="name"
                    placeholder="Administrator name"
                    className="h-10 !pl-11 border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors"
                    {...form.register('name', { onChange: clearOnChange })}
                  />
                </div>
                <FieldError message={form.formState.errors.name?.message} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
                  Email Address (Login ID) <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    className="h-10 !pl-11 border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors"
                    {...form.register('email', { onChange: clearOnChange })}
                  />
                </div>
                <FieldError message={form.formState.errors.email?.message} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-semibold text-slate-700">
                  Password <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min. 8 characters"
                    className="h-10 !pl-11 pr-10 border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors"
                    {...form.register('password', { onChange: clearOnChange })}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <FieldError message={form.formState.errors.password?.message} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-xs font-semibold text-slate-700">
                  Confirm Password <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Re-enter password"
                    className="h-10 !pl-11 pr-10 border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors"
                    {...form.register('confirmPassword', { onChange: clearOnChange })}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <FieldError message={form.formState.errors.confirmPassword?.message} />
              </div>
            </div>

            {/* Compact password requirements badge */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 pt-0.5">
              <span className={`inline-flex items-center gap-1 ${hasMinLength ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                <Check className="w-3 h-3" /> 8+ Characters
              </span>
              <span className={`inline-flex items-center gap-1 ${hasLetter ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                <Check className="w-3 h-3" /> Letters
              </span>
              <span className={`inline-flex items-center gap-1 ${hasNumber ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                <Check className="w-3 h-3" /> Numbers
              </span>
              <span className={`inline-flex items-center gap-1 ${hasSpecial ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                <Check className="w-3 h-3" /> Special symbol (@#$)
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 3: TERMS OF SERVICE & PRIVACY POLICY ACCEPTANCE */}
        <div className="pt-1">
          <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3.5 border border-slate-200">
            <Controller
              name="acceptTerms"
              control={form.control}
              render={({ field }) => (
                <Checkbox
                  id="acceptTerms"
                  checked={Boolean(field.value)}
                  onCheckedChange={(checked) => {
                    clearOnChange()
                    field.onChange(checked === true)
                  }}
                  className="mt-0.5"
                />
              )}
            />
            <div className="space-y-0.5 leading-snug">
              <Label
                htmlFor="acceptTerms"
                className="text-xs sm:text-sm font-normal text-slate-700 cursor-pointer select-none"
              >
                I agree to the{' '}
                <Link
                  href="/terms-of-service"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-blue-600 hover:text-blue-700 underline underline-offset-2"
                >
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link
                  href="/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-blue-600 hover:text-blue-700 underline underline-offset-2"
                >
                  Privacy Policy
                </Link>
                . <span className="text-destructive font-medium">*</span>
              </Label>
              <FieldError message={form.formState.errors.acceptTerms?.message} />
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER: VERIFICATION NOTICE & ACTION BUTTON PARALLEL */}
      <div className="border-t border-slate-200/80 bg-slate-50/90 px-5 py-4 sm:px-8 sm:py-5 space-y-3.5">
        {submitError && (
          <ConsoleMessage type="error" text={submitError} className="text-left w-full" />
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-center">
          {/* Verification Note (Parallel Left) */}
          <div
            role="note"
            className="md:col-span-7 flex items-center gap-2.5 rounded-xl bg-amber-50/90 border border-amber-300/80 px-3.5 py-2.5 text-amber-950 shadow-sm"
          >
            <Clock className="h-4.5 w-4.5 shrink-0 text-amber-600" aria-hidden />
            <p className="text-xs sm:text-[13px] font-medium leading-snug">
              {ORG_APPROVAL_NOTICE}
            </p>
          </div>

          {/* Submit Button (Parallel Right) */}
          <div className="md:col-span-5">
            <Button
              type="submit"
              className="h-11 sm:h-12 w-full text-sm sm:text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 transition-all rounded-xl"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Registering...
                </>
              ) : (
                'Register Organisation'
              )}
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 pt-0.5">
          <span className="inline-flex items-center gap-1 text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            256-bit SSL Encrypted &amp; Secure
          </span>
          <p>
            Already have an account?{' '}
            {onSignInClick ? (
              <button
                type="button"
                className="font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                onClick={onSignInClick}
              >
                Sign in
              </button>
            ) : (
              <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700 hover:underline">
                Sign in
              </Link>
            )}
          </p>
        </div>
      </div>
    </form>
  )
}
