'use client'

import { useState, useEffect, Suspense } from 'react'
import { getSession, signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, LoginInput } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CardContent, CardFooter } from '@/components/ui/card'
import { AuthCard } from '@/components/auth/auth-card'
import { ConsoleMessage } from '@/components/shared/console-message'
import { useConsoleMessage } from '@/hooks/use-console-message'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { ORG_APPROVAL_LOGIN_PENDING } from '@/lib/registration-messages'

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { message, showSuccess, showError, clearMessage } = useConsoleMessage()

  useEffect(() => {
    // Never keep credentials in the address bar (e.g. after a native GET form submit)
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.has('password') || params.has('email')) {
      const pending = params.get('pending')
      router.replace(pending === '1' ? '/login?pending=1' : '/login')
    }
  }, [router])

  useEffect(() => {
    if (searchParams.get('pending') === '1') {
      showSuccess(ORG_APPROVAL_LOGIN_PENDING)
    }
  }, [searchParams, showSuccess])

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (data: LoginInput) => {
    setLoading(true)
    clearMessage()
    try {
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      })

      if (result?.error) {
        const msgRes = await fetch('/api/auth/login-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: data.email, password: data.password }),
        })
        const msgData = await msgRes.json().catch(() => ({}))
        showError(
          typeof msgData?.message === 'string'
            ? msgData.message
            : 'Invalid email or password. Please check your credentials and try again.'
        )
      } else {
        const session = await getSession()
        showSuccess('Login successful! Redirecting...')
        const destination = session?.user?.isSuperAdmin ? '/superadmin' : '/dashboard'
        router.replace(destination)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard title="Login" subtitle="Sign in to your organization account">
      <form
        method="post"
        action="/login"
        autoComplete="on"
        onSubmit={(e) => {
          e.preventDefault()
          void form.handleSubmit(onSubmit)(e)
        }}
      >
        <CardContent className="space-y-4 px-6 pt-4 pb-2">
          {message && <ConsoleMessage type={message.type} text={message.text} />}

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm font-semibold text-slate-700">
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              placeholder="Enter your email"
              className="h-11 bg-white/80 border-slate-300 focus-visible:ring-blue-600 font-medium"
              {...form.register('email', {
                onChange: () => clearMessage(),
              })}
            />
            {form.formState.errors.email && (
              <p className="text-destructive text-xs font-medium">{form.formState.errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm font-semibold text-slate-700">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                className="h-11 pr-10 bg-white/80 border-slate-300 focus-visible:ring-blue-600 font-medium"
                {...form.register('password', {
                  onChange: () => clearMessage(),
                })}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 transition-colors"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {form.formState.errors.password && (
              <p className="text-destructive text-xs font-medium">{form.formState.errors.password.message}</p>
            )}
            <div className="flex justify-end pt-1">
              <Link
                href="/forgot-password"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
              >
                Forgot your password?
              </Link>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 px-6 pb-6 pt-3">
          <Button
            type="submit"
            className="w-full h-11 text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/25 transition-all hover:shadow-lg"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </Button>
        </CardFooter>
      </form>
    </AuthCard>
  )
}

