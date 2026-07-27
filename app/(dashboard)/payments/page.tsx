'use client'

import { PaymentList } from '@/components/payments/payment-list'

export default function PaymentsPage() {
  return (
    <PaymentList
      initialType="ALL"
      title="Payments"
      description="Unified view and management of customer receipts (Inward) and vendor payments (Outward)."
    />
  )
}
