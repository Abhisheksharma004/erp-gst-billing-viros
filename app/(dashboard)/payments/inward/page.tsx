'use client'

import Link from 'next/link'
import { ArrowLeft, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function PaymentInwardPage() {
  return (
    <div className="space-y-6 min-w-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <ArrowLeft className="h-4 w-4" />
            <span>Payments / Inward</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold">Payment Inward Upcoming(Module Inprogress)</h1>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          <span className="text-xs sm:text-sm">Add Payment</span>
        </Button>
      </div>

      
    </div>
  )
}
