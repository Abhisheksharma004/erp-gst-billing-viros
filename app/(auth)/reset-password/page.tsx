'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getPasswordResetEmail } from '@/lib/password-reset-session'

export default function ResetPasswordPage() {
  const router = useRouter()

  useEffect(() => {
    // Password reset completes on /verify-otp; keep this URL credential-free.
    const email = getPasswordResetEmail()
    router.replace(email ? '/verify-otp' : '/forgot-password')
  }, [router])

  return null
}
