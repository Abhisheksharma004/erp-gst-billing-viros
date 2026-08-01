'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SearchablePartySelect } from '@/components/ui/searchable-party-select'
import { ArrowLeftRight, Loader2, Calendar, CreditCard, Building } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface AddPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  defaultType?: 'INWARD' | 'OUTWARD'
}

export function AddPaymentModal({
  isOpen,
  onClose,
  onSuccess,
  defaultType = 'INWARD',
}: AddPaymentModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [fetchingParties, setFetchingParties] = useState(false)
  const [fetchingBills, setFetchingBills] = useState(false)

  const [type, setType] = useState<'INWARD' | 'OUTWARD'>(defaultType)
  const [parties, setParties] = useState<any[]>([])
  const [selectedPartyId, setSelectedPartyId] = useState<string>('')
  
  const [bills, setBills] = useState<any[]>([])
  const [selectedBillId, setSelectedBillId] = useState<string>('NONE')

  const [amount, setAmount] = useState<string>('')
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [paymentMode, setPaymentMode] = useState<string>('BANK_TRANSFER')
  const [referenceNo, setReferenceNo] = useState<string>('')
  const [bankName, setBankName] = useState<string>('')
  const [chequeDate, setChequeDate] = useState<string>('')
  const [notes, setNotes] = useState<string>('')

  const [partyDueInfo, setPartyDueInfo] = useState<{ totalDue: number; unpaidCount: number } | null>(null)

  // Reset form when type or defaultType changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setType(defaultType)
      setSelectedPartyId('')
      setSelectedBillId('NONE')
      setPartyDueInfo(null)
      setAmount('')
      setPaymentDate(new Date().toISOString().split('T')[0])
      setPaymentMode('BANK_TRANSFER')
      setReferenceNo('')
      setBankName('')
      setChequeDate('')
      setNotes('')
    }
  }, [isOpen, defaultType])

  // Fetch customers or vendors when type changes
  useEffect(() => {
    if (!isOpen) return
    const fetchParties = async () => {
      setFetchingParties(true)
      setSelectedPartyId('')
      setSelectedBillId('NONE')
      setPartyDueInfo(null)
      setBills([])
      try {
        const endpoint = type === 'INWARD' ? '/api/customers?limit=100' : '/api/vendors?limit=100'
        const res = await fetch(endpoint)
        if (res.ok) {
          const data = await res.json()
          setParties(type === 'INWARD' ? data.customers || [] : data.vendors || [])
        }
      } catch (err) {
        console.error('Failed to fetch parties:', err)
      } finally {
        setFetchingParties(false)
      }
    }
    fetchParties()
  }, [type, isOpen])

  // Fetch invoices or purchases and party due info when customer/vendor is selected
  useEffect(() => {
    if (!isOpen || !selectedPartyId) {
      setBills([])
      setSelectedBillId('NONE')
      setPartyDueInfo(null)
      return
    }

    const fetchPartyData = async () => {
      setFetchingBills(true)
      setSelectedBillId('NONE')
      try {
        const partyType = type === 'INWARD' ? 'CUSTOMER' : 'VENDOR'
        const dueRes = await fetch(`/api/payments/party-due?partyType=${partyType}&partyId=${selectedPartyId}`)
        if (dueRes.ok) {
          const dueData = await dueRes.json()
          setPartyDueInfo({
            totalDue: dueData.totalDue || 0,
            unpaidCount: dueData.unpaidCount || 0,
          })
        }

        let endpoint = ''
        if (type === 'INWARD') {
          endpoint = `/api/invoices?customerId=${selectedPartyId}&limit=50`
        } else {
          endpoint = `/api/purchases?vendorId=${selectedPartyId}&limit=50`
        }

        const res = await fetch(endpoint)
        if (res.ok) {
          const data = await res.json()
          const rawItems = type === 'INWARD' ? data.invoices || [] : data.purchases || []
          // Filter to show ONLY unpaid or partially paid bills (where remaining balance > 0)
          const activeBills = rawItems.filter((item: any) => {
            const statusUpper = String(item.status || '').toUpperCase()
            if (statusUpper === 'CANCELLED' || statusUpper === 'PAID') return false
            const balance = item.balance_amount !== undefined && item.balance_amount !== null
              ? Number(item.balance_amount)
              : Number(item.total_amount || 0) - Number(item.paid_amount || 0)
            return balance > 0
          })
          setBills(activeBills)
        }
      } catch (err) {
        console.error('Failed to fetch party data:', err)
      } finally {
        setFetchingBills(false)
      }
    }

    fetchPartyData()
  }, [selectedPartyId, type, isOpen])

  // Handle bill selection -> auto-populate balance amount
  const handleBillSelect = (billId: string) => {
    setSelectedBillId(billId)
    if (billId === 'NONE') return

    const selectedBill = bills.find((b) => b.id === billId)
    if (selectedBill) {
      const bal = Number(selectedBill.balance_amount ?? selectedBill.total_amount ?? 0)
      if (bal > 0) {
        setAmount(bal.toString())
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedPartyId) {
      toast({
        title: 'Validation Error',
        description: type === 'INWARD' ? 'Please select a customer' : 'Please select a vendor',
        variant: 'destructive',
      })
      return
    }

    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Payment amount must be greater than 0',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    try {
      const payload: any = {
        type,
        amount: numAmount,
        paymentDate,
        paymentMode,
        referenceNo: referenceNo.trim() || undefined,
        bankName: bankName.trim() || undefined,
        chequeDate: chequeDate.trim() || undefined,
        notes: notes.trim() || undefined,
      }

      if (type === 'INWARD') {
        payload.customerId = selectedPartyId
        if (selectedBillId !== 'NONE') {
          payload.invoiceId = selectedBillId
        }
      } else {
        payload.vendorId = selectedPartyId
        if (selectedBillId !== 'NONE') {
          payload.purchaseId = selectedBillId
        }
      }

      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to record payment')
      }

      toast({
        title: 'Payment Recorded',
        description: `Payment ${data.payment.paymentNo} of ₹${numAmount.toLocaleString('en-IN')} recorded successfully.`,
      })

      onSuccess()
      onClose()
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to record payment',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary font-medium text-sm">
            <ArrowLeftRight className="h-4 w-4" />
            <span>Record Payment</span>
          </div>
          <DialogTitle className="text-xl">
            {type === 'INWARD' ? 'Customer Payment Receipt (Inward)' : 'Vendor Payment (Outward)'}
          </DialogTitle>
          <DialogDescription>
            {type === 'INWARD'
              ? 'Record incoming funds received from a customer and apply against sales invoice or advance.'
              : 'Record outgoing payment made to a vendor for purchases or bills.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Payment Type Selection */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant={type === 'INWARD' ? 'default' : 'outline'}
              className={`w-full justify-center ${type === 'INWARD' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
              onClick={() => setType('INWARD')}
            >
              Payment Inward (Receipt)
            </Button>
            <Button
              type="button"
              variant={type === 'OUTWARD' ? 'default' : 'outline'}
              className={`w-full justify-center ${type === 'OUTWARD' ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}`}
              onClick={() => setType('OUTWARD')}
            >
              Payment Outward (Paid)
            </Button>
          </div>

          {/* Party Selection (Customer or Vendor) */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">
              {type === 'INWARD' ? 'Select Customer *' : 'Select Vendor *'}
            </Label>
            {fetchingParties ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading {type === 'INWARD' ? 'customers' : 'vendors'}...
              </div>
            ) : (
              <SearchablePartySelect
                value={selectedPartyId}
                onValueChange={setSelectedPartyId}
                options={parties}
                placeholder={`-- Choose ${type === 'INWARD' ? 'Customer' : 'Vendor'} --`}
                className="h-10 w-full"
              />
            )}

            {/* Outstanding Due Banner */}
            {partyDueInfo && (
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 p-2.5 rounded-md flex items-center justify-between text-xs mt-2">
                <div>
                  <span className="text-amber-800 dark:text-amber-300 font-semibold block">Total Outstanding Due</span>
                  <span className="text-muted-foreground">{partyDueInfo.unpaidCount} unpaid {type === 'INWARD' ? 'invoices' : 'bills'}</span>
                </div>
                <span className="text-base font-bold text-amber-700 dark:text-amber-400">
                  ₹{partyDueInfo.totalDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>

          {/* Linked Invoice / Purchase Bill Selection */}
          {selectedPartyId && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold">
                {type === 'INWARD' ? 'Link to Invoice (Optional)' : 'Link to Purchase Bill (Optional)'}
              </Label>
              {fetchingBills ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-1">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Fetching pending bills...
                </div>
              ) : (
                <Select value={selectedBillId} onValueChange={handleBillSelect}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="-- Select Bill or Advance Payment --" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="NONE">No Specific Invoice (Advance / Direct Credit)</SelectItem>
                    {bills.map((bill) => {
                      const billNo = type === 'INWARD' ? bill.invoice_no : bill.bill_no
                      const balance = Number(bill.balance_amount ?? bill.total_amount ?? 0)
                      return (
                        <SelectItem key={bill.id} value={bill.id}>
                          {billNo} — Unpaid Bal: ₹{balance.toLocaleString('en-IN')} (Total: ₹{Number(bill.total_amount).toLocaleString('en-IN')})
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Amount & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Payment Amount (₹) *</Label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-sm font-semibold text-muted-foreground select-none">₹</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  className="pl-9"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Payment Date *</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  className="pl-9"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* Payment Mode & Ref Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Payment Mode *</Label>
              <Select value={paymentMode} onValueChange={setPaymentMode}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS/IMPS)</SelectItem>
                  <SelectItem value="UPI">UPI (GPay / PhonePe / Paytm)</SelectItem>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="CHEQUE">Cheque</SelectItem>
                  <SelectItem value="CARD">Credit / Debit Card</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Reference / UTR / Transaction No</Label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="e.g. UTR12345678"
                  className="pl-9"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Bank Name & Cheque Date (Conditional) */}
          {(paymentMode === 'CHEQUE' || paymentMode === 'BANK_TRANSFER') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Bank Name</Label>
                <div className="relative">
                  <Building className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="e.g. HDFC Bank, SBI"
                    className="pl-9"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                  />
                </div>
              </div>

              {paymentMode === 'CHEQUE' && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Cheque Date</Label>
                  <Input
                    type="date"
                    value={chequeDate}
                    onChange={(e) => setChequeDate(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          {/* Notes / Remarks */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Notes / Remarks</Label>
            <Textarea
              placeholder="Optional payment remarks or transaction breakdown..."
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <DialogFooter className="pt-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className={type === 'INWARD' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save {type === 'INWARD' ? 'Receipt' : 'Payment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
