'use client'

import { AuthCard } from '@/components/auth/auth-card'
import { RegisterForm } from '@/components/auth/register-form'

export default function RegisterPage() {
  return (
    <AuthCard
      title="Register Organisation"
      subtitle="Set up your company profile and admin account to get started with GST Billing & ERP"
      className="max-w-2xl"
    >
      <RegisterForm />
    </AuthCard>
  )
}

