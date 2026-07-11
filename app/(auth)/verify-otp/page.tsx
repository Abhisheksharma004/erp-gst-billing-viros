'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CardContent, CardFooter } from '@/components/ui/card'
import { AuthCard } from '@/components/auth/auth-card'
import { Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'
import { PASSWORD_REQUIREMENTS_MESSAGE, OTP_EXPIRY_SECONDS, OTP_LENGTH, isStrongEnoughPassword } from '@/lib/auth-otp'
import {
  clearPasswordResetSession,
  getPasswordResetEmail,
} from '@/lib/password-reset-session'

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return 'your email'
  const visible = local.slice(0, Math.min(2, local.length))
  return `${visible}***@${domain}`
}

export default function VerifyOTPPage() {
  const [email, setEmail] = useState('')
  const [ready, setReady] = useState(false)
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [verified, setVerified] = useState(false)
  const [verifiedOtp, setVerifiedOtp] = useState('')
  const [secondsLeft, setSecondsLeft] = useState(OTP_EXPIRY_SECONDS)
  const [canResend, setCanResend] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const resetTimer = useCallback(() => {
    setSecondsLeft(OTP_EXPIRY_SECONDS)
    setCanResend(false)
  }, [])

  useEffect(() => {
    const stored = getPasswordResetEmail()
    if (!stored) {
      router.replace('/forgot-password')
      return
    }
    setEmail(stored)
    setReady(true)
  }, [router])

  useEffect(() => {
    if (!ready || verified || canResend) return
    if (secondsLeft <= 0) {
      setCanResend(true)
      return
    }
    const timer = window.setTimeout(() => {
      setSecondsLeft((prev) => prev - 1)
    }, 1000)
    return () => window.clearTimeout(timer)
  }, [ready, secondsLeft, verified, canResend])

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (verified || canResend) return

    setLoading(true)
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      })

      const data = await response.json()

      if (response.ok) {
        setVerified(true)
        setVerifiedOtp(otp)
        toast({
          title: 'OTP Verified',
          description: 'Set your new password below.',
        })
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Something went wrong',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Network error. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleResendOTP = async () => {
    if (!canResend || loading) return

    setLoading(true)
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        setOtp('')
        resetTimer()
        toast({
          title: 'OTP Resent',
          description: 'A new OTP has been sent to your email.',
        })
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Something went wrong',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Network error. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!verified) return

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        variant: 'destructive',
      })
      return
    }

    if (!isStrongEnoughPassword(newPassword)) {
      toast({
        title: 'Error',
        description: PASSWORD_REQUIREMENTS_MESSAGE,
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: verifiedOtp, newPassword }),
      })

      const data = await response.json()

      if (response.ok) {
        clearPasswordResetSession()
        toast({
          title: 'Success',
          description: 'Password reset successfully. Redirecting to login...',
        })
        setTimeout(() => {
          router.push('/login')
        }, 2000)
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Something went wrong',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Network error. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (!ready || !email) {
    return null
  }

  const displayEmail = maskEmail(email)

  return (
    <AuthCard title={verified ? 'Reset Password' : 'Verify OTP'}>
      <form
        method="post"
        action="/verify-otp"
        onSubmit={(e) => {
          e.preventDefault()
          if (verified) void handleResetPassword(e)
          else void handleVerifyOtp(e)
        }}
      >
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            {verified
              ? `OTP verified for ${displayEmail}. Enter your new password.`
              : `Enter the ${OTP_LENGTH}-digit OTP sent to ${displayEmail}`}
          </p>

          {!verified && (
            <div className="space-y-2">
              <Label htmlFor="otp">OTP</Label>
              <Input
                id="otp"
                type="text"
                inputMode="numeric"
                placeholder={`Enter ${OTP_LENGTH}-digit OTP`}
                className="text-center text-2xl tracking-widest"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH))}
                maxLength={OTP_LENGTH}
                required
                disabled={canResend}
              />
            </div>
          )}

          {verified && (
            <>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Letter, number & special char"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">{PASSWORD_REQUIREMENTS_MESSAGE}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          {verified ? (
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reset Password
            </Button>
          ) : (
            <>
              <Button
                type="submit"
                className="w-full"
                disabled={loading || otp.length !== OTP_LENGTH || canResend}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify OTP
              </Button>
              {canResend ? (
                <p className="text-center text-sm font-bold text-red-600">
                  OTP expired. Resend to get a new code.
                </p>
              ) : (
                <p className="text-center text-sm text-red-600">
                  OTP expires in{' '}
                  <span className="font-bold text-base tabular-nums">{formatTimer(secondsLeft)}</span>
                </p>
              )}
              <Button
                type="button"
                variant="link"
                onClick={handleResendOTP}
                disabled={loading || !canResend}
                className="text-sm text-primary disabled:opacity-50"
              >
                Resend OTP
              </Button>
            </>
          )}
          <Link
            href="/forgot-password"
            className="text-sm text-primary hover:underline"
            onClick={() => clearPasswordResetSession()}
          >
            Back to Forgot Password
          </Link>
        </CardFooter>
      </form>
    </AuthCard>
  )
}
