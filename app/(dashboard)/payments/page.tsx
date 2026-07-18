'use client'

import Link from 'next/link'
import { ArrowRightLeft, ArrowRight, Wallet } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const sections = [
  {
    title: 'Payment Inward',
    description: 'Track incoming payments from customers and reconcile receipts.',
    href: '/payments/inward',
    icon: ArrowRightLeft,
  },
  {
    title: 'Payment Outward',
    description: 'Manage outgoing payments to vendors and other payees.',
    href: '/payments/outward',
    icon: ArrowRight,
  },
]

export default function PaymentsPage() {
  return (
    <div className="space-y-6 min-w-0">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <Wallet className="h-4 w-4" />
          <span>Payments</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold">Payments</h1>
        <p className="text-sm text-muted-foreground">
          Choose a payment workflow to manage inward and outward transactions.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {sections.map((section) => {
          const Icon = section.icon
          return (
            <Link key={section.href} href={section.href} className="group">
              <Card className="h-full transition-colors hover:border-primary/50 hover:bg-accent/50">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg border bg-background p-2">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{section.title}</CardTitle>
                  </div>
                  <CardDescription>{section.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm font-medium text-primary">
                    Open section
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
