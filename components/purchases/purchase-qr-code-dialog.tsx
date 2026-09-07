'use client'

import { useEffect, useState, useMemo } from 'react'
import QRCode from 'qrcode'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency, cn } from '@/lib/utils'
import {
  QrCode,
  Printer,
  Copy,
  Check,
  RefreshCw,
  SlidersHorizontal,
  Eye,
  Package,
  Layers,
  FileText,
  Maximize2,
  Tag,
} from 'lucide-react'

export interface PurchaseItemForQR {
  id?: string
  product_id?: string | null
  product_name?: string
  description?: string | null
  product_sku?: string | null
  product_barcode?: string | null
  product_mrp?: number | null
  product_selling_price?: number | null
  rate?: number
  quantity: number
  unit_short_name?: string | null
}

export interface PurchaseDataForQR {
  id?: string
  bill_no?: string | null
  date: string
  bill_date?: string | null
  vendor_name?: string | null
  items?: PurchaseItemForQR[]
}

interface PurchaseQrCodeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  purchaseId?: string | null
  purchaseData?: PurchaseDataForQR | null
}

interface ItemConfig {
  itemId: string
  selected: boolean
  sku: string
  quantity: number
  unitName: string
  productName: string
  mrp?: number | null
  rate?: number
}

interface GeneratedLabel {
  id: string
  payload: string
  qrDataUrl: string
  productName: string
  sku: string
  serialNumber: number
  totalInBatch: number
  formattedSerial: string
  dateString: string
  mrp?: number | null
  rate?: number
}

// Format date to DDMMYY or other formats
function formatDateForQR(dateInput: string | Date, formatType: string): string {
  const d = new Date(dateInput)
  if (isNaN(d.getTime())) return ''
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const fullYear = String(d.getFullYear())
  const shortYear = fullYear.slice(-2)

  switch (formatType) {
    case 'DDMMYY': // Default requested by user
      return `${day}${month}${shortYear}`
    case 'DDMMYYYY':
      return `${day}${month}${fullYear}`
    case 'DD-MM-YY':
      return `${day}-${month}-${shortYear}`
    case 'DD-MM-YYYY':
      return `${day}-${month}-${fullYear}`
    case 'YYYYMMDD':
      return `${fullYear}${month}${day}`
    case 'YYYY-MM-DD':
      return `${fullYear}-${month}-${day}`
    case 'YYMMDD':
      return `${shortYear}${month}${day}`
    default:
      return `${day}${month}${shortYear}`
  }
}

export function PurchaseQrCodeDialog({
  open,
  onOpenChange,
  purchaseId,
  purchaseData: initialPurchaseData,
}: PurchaseQrCodeDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [purchase, setPurchase] = useState<PurchaseDataForQR | null>(initialPurchaseData || null)

  // Label Size & Printer Type Customization
  const [labelWidth, setLabelWidth] = useState<number>(50) // Default 50mm
  const [labelHeight, setLabelHeight] = useState<number>(25) // Default 25mm
  const [printerType, setPrinterType] = useState<'DIRECT_THERMAL' | 'THERMAL_TRANSFER'>('DIRECT_THERMAL')

  // Code Combination controls
  const [dateFormat, setDateFormat] = useState<string>('DDMMYY')
  const [delimiter, setDelimiter] = useState<string>('-')
  const [serialDigits, setSerialDigits] = useState<string>('3') // '3' -> 001, '2' -> 01, '4' -> 0001, '1' -> 1
  const [startSerial, setStartSerial] = useState<number>(1)
  const [customPrefix, setCustomPrefix] = useState<string>('')

  // Display Options on Label
  const [showProductName, setShowProductName] = useState(true)
  const [showSku, setShowSku] = useState(true)
  const [showPayload, setShowPayload] = useState(true)
  const [showSerialBadge, setShowSerialBadge] = useState(true)
  const [showDate, setShowDate] = useState(true)
  const [showPrice, setShowPrice] = useState(false)

  // Navigation tab state (self-contained)
  const [activeTab, setActiveTab] = useState<'preview' | 'configure' | 'list'>('preview')

  // Item configurations
  const [itemConfigs, setItemConfigs] = useState<ItemConfig[]>([])
  const [generatedLabels, setGeneratedLabels] = useState<GeneratedLabel[]>([])
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  // Fetch purchase details if only purchaseId is provided
  useEffect(() => {
    if (!open) return

    if (initialPurchaseData) {
      setPurchase(initialPurchaseData)
      initItemConfigs(initialPurchaseData)
      return
    }

    if (purchaseId) {
      setLoading(true)
      fetch(`/api/purchases/${purchaseId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && !data.error) {
            setPurchase(data)
            initItemConfigs(data)
          } else {
            toast({ title: data.error || 'Failed to load purchase', variant: 'destructive' })
          }
        })
        .catch((err) => {
          console.error(err)
          toast({ title: 'Error loading purchase items', variant: 'destructive' })
        })
        .finally(() => setLoading(false))
    }
  }, [open, purchaseId, initialPurchaseData, toast])

  const initItemConfigs = (p: PurchaseDataForQR) => {
    if (!p.items || p.items.length === 0) {
      setItemConfigs([])
      return
    }
    const configs: ItemConfig[] = p.items.map((item, index) => {
      const fallbackSku =
        item.product_sku ||
        item.product_barcode ||
        (item.product_name
          ? item.product_name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase()
          : `SKU${index + 1}`)

      return {
        itemId: item.id || `item-${index}`,
        selected: true,
        sku: fallbackSku,
        quantity: Math.max(1, Math.round(Number(item.quantity) || 1)),
        unitName: item.unit_short_name || 'NOS',
        productName: item.product_name || item.description || `Product ${index + 1}`,
        mrp: item.product_mrp ?? null,
        rate: item.rate ?? item.product_selling_price ?? undefined,
      }
    })
    setItemConfigs(configs)
  }

  // Generate QR Code labels
  useEffect(() => {
    if (!open || !purchase || itemConfigs.length === 0) {
      setGeneratedLabels([])
      return
    }

    let isCancelled = false
    setGenerating(true)

    const dateStr = formatDateForQR(purchase.bill_date || purchase.date, dateFormat)
    const activeDelimiter = delimiter === 'NONE' ? '' : delimiter

    const generateAll = async () => {
      const labels: GeneratedLabel[] = []

      for (const config of itemConfigs) {
        if (!config.selected || config.quantity <= 0) continue

        const skuClean = (config.sku || 'SKU').trim()
        const qty = config.quantity

        for (let i = 0; i < qty; i++) {
          const serialNum = startSerial + i
          let formattedSerial = String(serialNum)
          if (serialDigits === '2') formattedSerial = String(serialNum).padStart(2, '0')
          else if (serialDigits === '3') formattedSerial = String(serialNum).padStart(3, '0')
          else if (serialDigits === '4') formattedSerial = String(serialNum).padStart(4, '0')

          // Combination: (SKUCode + Date + Serial number)
          let payload = ''
          if (customPrefix.trim()) {
            payload += `${customPrefix.trim()}${activeDelimiter}`
          }
          payload += `${skuClean}${activeDelimiter}${dateStr}${activeDelimiter}${formattedSerial}`

          try {
            const qrDataUrl = await QRCode.toDataURL(payload, {
              errorCorrectionLevel: 'M',
              margin: 1,
              width: 240,
              color: {
                dark: '#000000',
                light: '#ffffff',
              },
            })

            labels.push({
              id: `${config.itemId}-${i}`,
              payload,
              qrDataUrl,
              productName: config.productName,
              sku: skuClean,
              serialNumber: serialNum,
              totalInBatch: qty,
              formattedSerial,
              dateString: dateStr,
              mrp: config.mrp,
              rate: config.rate,
            })
          } catch (e) {
            console.error('Failed to generate QR for payload:', payload, e)
          }
        }
      }

      if (!isCancelled) {
        setGeneratedLabels(labels)
        setGenerating(false)
      }
    }

    generateAll()

    return () => {
      isCancelled = true
    }
  }, [
    open,
    purchase,
    itemConfigs,
    dateFormat,
    delimiter,
    serialDigits,
    startSerial,
    customPrefix,
  ])

  const totalQrCount = generatedLabels.length

  const handlePrint = () => {
    window.print()
  }

  const handleCopySerials = () => {
    if (generatedLabels.length === 0) return
    const text = generatedLabels.map((l) => `${l.productName}\t${l.payload}`).join('\n')
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      toast({ title: 'Copied to clipboard', description: `${generatedLabels.length} QR serial codes copied.` })
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const updateItemConfig = (itemId: string, updates: Partial<ItemConfig>) => {
    setItemConfigs((prev) =>
      prev.map((item) => (item.itemId === itemId ? { ...item, ...updates } : item))
    )
  }

  const toggleSelectAll = (checked: boolean) => {
    setItemConfigs((prev) => prev.map((item) => ({ ...item, selected: checked })))
  }

  const allSelected = itemConfigs.length > 0 && itemConfigs.every((i) => i.selected)

  // Safe valid width/height
  const validWidth = Math.max(10, Math.min(300, labelWidth || 50))
  const validHeight = Math.max(10, Math.min(300, labelHeight || 25))

  return (
    <>
      {/* Dynamic exact label size print styles */}
      <style jsx global>{`
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }
          body * {
            visibility: hidden;
          }
          #qr-printable-area,
          #qr-printable-area * {
            visibility: visible;
          }
          #qr-printable-area {
            position: absolute;
            left: 0;
            top: 0;
            width: ${validWidth}mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          @page {
            size: ${validWidth}mm ${validHeight}mm;
            margin: 0mm;
          }
          .custom-qr-label {
            width: ${validWidth}mm !important;
            height: ${validHeight}mm !important;
            max-width: ${validWidth}mm !important;
            max-height: ${validHeight}mm !important;
            min-width: ${validWidth}mm !important;
            min-height: ${validHeight}mm !important;
            padding: 1.2mm 1.5mm !important;
            box-sizing: border-box !important;
            page-break-after: always !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin: 0 !important;
            border: none !important;
            background: #ffffff !important;
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            gap: 1.5mm !important;
            overflow: hidden !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0 overflow-hidden gap-0">
          {/* Header */}
          <DialogHeader className="p-4 sm:p-5 border-b bg-muted/20 shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <DialogTitle className="text-lg font-bold">
                      Purchase Product QR Codes
                    </DialogTitle>
                    {totalQrCount > 0 && (
                      <Badge variant="secondary" className="font-semibold text-xs">
                        {totalQrCount} {totalQrCount === 1 ? 'Label' : 'Labels'}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40">
                      {validWidth}mm × {validHeight}mm
                    </Badge>
                    <Badge variant="secondary" className="text-[11px] font-medium">
                      {printerType === 'DIRECT_THERMAL' ? 'Direct Thermal' : 'Thermal Transfer'}
                    </Badge>
                  </div>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Combination: <code className="font-mono text-foreground font-semibold">(SKUCode + Date({dateFormat}) + Serial)</code>
                    {purchase?.bill_no && ` • Bill #${purchase.bill_no}`}
                  </DialogDescription>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopySerials}
                  disabled={totalQrCount === 0}
                  className="h-9 text-xs gap-1.5"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  Copy List
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handlePrint}
                  disabled={totalQrCount === 0 || generating}
                  className="h-9 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-medium"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print QR Labels ({validWidth}×{validHeight}mm)
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* Main Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {loading ? (
              <div className="py-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                <p className="text-sm">Loading purchase products...</p>
              </div>
            ) : itemConfigs.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                <Package className="w-8 h-8 text-muted-foreground" />
                <p className="text-sm font-medium">No products found in this purchase invoice</p>
              </div>
            ) : (
              <div className="w-full space-y-4">
                {/* Navigation Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-3">
                  <div className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground">
                    <button
                      type="button"
                      onClick={() => setActiveTab('preview')}
                      className={cn(
                        'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium ring-offset-background transition-all gap-1.5',
                        activeTab === 'preview'
                          ? 'bg-background text-foreground shadow'
                          : 'hover:text-foreground'
                      )}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Preview ({totalQrCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('configure')}
                      className={cn(
                        'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium ring-offset-background transition-all gap-1.5',
                        activeTab === 'configure'
                          ? 'bg-background text-foreground shadow'
                          : 'hover:text-foreground'
                      )}
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      Format Settings
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('list')}
                      className={cn(
                        'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium ring-offset-background transition-all gap-1.5',
                        activeTab === 'list'
                          ? 'bg-background text-foreground shadow'
                          : 'hover:text-foreground'
                      )}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      Items ({itemConfigs.length})
                    </button>
                  </div>

                  {/* Label Specification Badge */}
                  {activeTab === 'preview' && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium bg-muted/60 px-2.5 py-1 rounded-md border">
                      <span>Label Size:</span>
                      <strong className="text-foreground font-mono font-semibold">
                        {validWidth}mm × {validHeight}mm
                      </strong>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-foreground font-medium">
                        {printerType === 'DIRECT_THERMAL' ? 'Direct Thermal' : 'Thermal Transfer'}
                      </span>
                    </div>
                  )}
                </div>

                {/* TAB 1: PREVIEW */}
                {activeTab === 'preview' && (
                  <div className="space-y-4">
                    {generating ? (
                      <div className="py-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
                        <p className="text-sm">Generating QR codes...</p>
                      </div>
                    ) : generatedLabels.length === 0 ? (
                      <div className="py-12 text-center text-muted-foreground">
                        <p className="text-sm">No items selected. Please select items in the Items tab.</p>
                      </div>
                    ) : (
                      <div id="qr-printable-area" className="w-full">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 print:block">
                          {generatedLabels.map((label) => (
                            <div
                              key={label.id}
                              className={cn(
                                'custom-qr-label border border-neutral-300 dark:border-neutral-700 bg-white text-neutral-900 rounded-lg p-2.5 flex items-center gap-2.5 shadow-sm transition-all',
                                'print:border-none print:shadow-none print:rounded-none'
                              )}
                              style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
                            >
                              {/* QR Code Graphic */}
                              <div className="shrink-0 bg-white p-0.5 rounded border border-neutral-200 print:border-none flex items-center justify-center">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={label.qrDataUrl}
                                  alt={label.payload}
                                  className="w-[72px] h-[72px] min-w-[72px] min-h-[72px] object-contain print:w-[20mm] print:h-[20mm]"
                                />
                              </div>

                              {/* Label Details */}
                              <div className="min-w-0 flex-1 flex flex-col justify-center text-left space-y-0.5 leading-tight overflow-hidden">
                                {showProductName && (
                                  <p className="font-bold text-[11px] truncate text-black leading-tight" title={label.productName}>
                                    {label.productName}
                                  </p>
                                )}

                                {showSku && (
                                  <p className="text-[9.5px] font-semibold text-neutral-700 truncate tracking-tight">
                                    SKU: <span className="font-mono">{label.sku}</span>
                                  </p>
                                )}

                                {showPayload && (
                                  <p className="font-mono text-[9px] font-bold text-black truncate select-all bg-neutral-100 px-1 py-0.5 rounded">
                                    {label.payload}
                                  </p>
                                )}

                                <div className="flex items-center justify-between gap-1 text-[8.5px] text-neutral-600 pt-0.5">
                                  {showSerialBadge && (
                                    <span className="font-semibold text-emerald-800">
                                      #{label.formattedSerial} ({label.serialNumber}/{label.totalInBatch})
                                    </span>
                                  )}
                                  {showDate && (
                                    <span className="ml-auto font-mono text-[8.5px] text-neutral-500">
                                      {label.dateString}
                                    </span>
                                  )}
                                </div>

                                {showPrice && (label.mrp || label.rate) && (
                                  <div className="text-[8.5px] font-semibold text-black truncate pt-0.5">
                                    {label.mrp ? `MRP: ${formatCurrency(label.mrp)}` : `Rate: ${formatCurrency(label.rate || 0)}`}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: FORMAT & LABEL SIZE SETTINGS */}
                {activeTab === 'configure' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* COLUMN 1: LABEL SIZE & PRINTER TYPE CUSTOMIZATION */}
                      <Card className="shadow-sm border-emerald-200 dark:border-emerald-900/60">
                        <CardContent className="p-4 space-y-4">
                          <h4 className="text-sm font-semibold flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                            <Maximize2 className="w-4 h-4" />
                            Label Size & Printer Type
                          </h4>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs">Width (mm)</Label>
                              <Input
                                type="number"
                                min={10}
                                max={300}
                                value={labelWidth}
                                onChange={(e) => setLabelWidth(parseInt(e.target.value) || 50)}
                                className="h-9 text-xs font-semibold"
                                placeholder="50"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-xs">Height (mm)</Label>
                              <Input
                                type="number"
                                min={10}
                                max={300}
                                value={labelHeight}
                                onChange={(e) => setLabelHeight(parseInt(e.target.value) || 25)}
                                className="h-9 text-xs font-semibold"
                                placeholder="25"
                              />
                            </div>
                          </div>

                          {/* Quick Size Presets */}
                          <div className="space-y-1.5">
                            <Label className="text-[11px] text-muted-foreground">Quick Presets:</Label>
                            <div className="flex flex-wrap gap-1.5">
                              <button
                                type="button"
                                onClick={() => { setLabelWidth(50); setLabelHeight(25) }}
                                className={cn(
                                  'text-[10px] px-2 py-0.5 rounded border font-mono transition-all',
                                  labelWidth === 50 && labelHeight === 25
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold dark:bg-emerald-950 dark:text-emerald-300'
                                    : 'hover:bg-muted text-muted-foreground'
                                )}
                              >
                                50×25 mm
                              </button>
                              <button
                                type="button"
                                onClick={() => { setLabelWidth(50); setLabelHeight(30) }}
                                className={cn(
                                  'text-[10px] px-2 py-0.5 rounded border font-mono transition-all',
                                  labelWidth === 50 && labelHeight === 30
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold dark:bg-emerald-950 dark:text-emerald-300'
                                    : 'hover:bg-muted text-muted-foreground'
                                )}
                              >
                                50×30 mm
                              </button>
                              <button
                                type="button"
                                onClick={() => { setLabelWidth(75); setLabelHeight(50) }}
                                className={cn(
                                  'text-[10px] px-2 py-0.5 rounded border font-mono transition-all',
                                  labelWidth === 75 && labelHeight === 50
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold dark:bg-emerald-950 dark:text-emerald-300'
                                    : 'hover:bg-muted text-muted-foreground'
                                )}
                              >
                                75×50 mm
                              </button>
                              <button
                                type="button"
                                onClick={() => { setLabelWidth(100); setLabelHeight(50) }}
                                className={cn(
                                  'text-[10px] px-2 py-0.5 rounded border font-mono transition-all',
                                  labelWidth === 100 && labelHeight === 50
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold dark:bg-emerald-950 dark:text-emerald-300'
                                    : 'hover:bg-muted text-muted-foreground'
                                )}
                              >
                                100×50 mm
                              </button>
                            </div>
                          </div>

                          {/* Printer Type: Only two options */}
                          <div className="space-y-1.5 pt-1">
                            <Label className="text-xs">Printer / Label Type</Label>
                            <Select
                              value={printerType}
                              onValueChange={(v: 'DIRECT_THERMAL' | 'THERMAL_TRANSFER') => setPrinterType(v)}
                            >
                              <SelectTrigger className="h-9 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="DIRECT_THERMAL">Direct Thermal (No Ribbon)</SelectItem>
                                <SelectItem value="THERMAL_TRANSFER">Thermal Transfer (Ribbon Required)</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-[10px] text-muted-foreground">
                              {printerType === 'DIRECT_THERMAL'
                                ? 'Heat-sensitive direct thermal paper roll'
                                : 'Thermal transfer ribbon (Wax / Resin) roll'}
                            </p>
                          </div>
                        </CardContent>
                      </Card>

                      {/* COLUMN 2: CODE COMBINATION STRUCTURE */}
                      <Card className="shadow-sm">
                        <CardContent className="p-4 space-y-4">
                          <h4 className="text-sm font-semibold flex items-center gap-1.5 text-primary">
                            <QrCode className="w-4 h-4" />
                            Code Combination Structure
                          </h4>

                          <div className="space-y-1.5">
                            <Label className="text-xs">Date Format (Default: DDMMYY)</Label>
                            <Select value={dateFormat} onValueChange={setDateFormat}>
                              <SelectTrigger className="h-9 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="DDMMYY">DDMMYY (e.g. 070926)</SelectItem>
                                <SelectItem value="DDMMYYYY">DDMMYYYY (e.g. 07092026)</SelectItem>
                                <SelectItem value="DD-MM-YY">DD-MM-YY (e.g. 07-09-26)</SelectItem>
                                <SelectItem value="DD-MM-YYYY">DD-MM-YYYY (e.g. 07-09-2026)</SelectItem>
                                <SelectItem value="YYYYMMDD">YYYYMMDD (e.g. 20260907)</SelectItem>
                                <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-09-07)</SelectItem>
                                <SelectItem value="YYMMDD">YYMMDD (e.g. 260907)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs">Delimiter</Label>
                              <Select value={delimiter} onValueChange={setDelimiter}>
                                <SelectTrigger className="h-9 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="-">Hyphen (-)</SelectItem>
                                  <SelectItem value="_">Underscore (_)</SelectItem>
                                  <SelectItem value="/">Slash (/)</SelectItem>
                                  <SelectItem value="NONE">None</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-xs">Serial Digits</Label>
                              <Select value={serialDigits} onValueChange={setSerialDigits}>
                                <SelectTrigger className="h-9 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="3">3 Digits (001...)</SelectItem>
                                  <SelectItem value="2">2 Digits (01...)</SelectItem>
                                  <SelectItem value="4">4 Digits (0001...)</SelectItem>
                                  <SelectItem value="1">No Pad (1...)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs">Starting Serial #</Label>
                              <Input
                                type="number"
                                min={1}
                                value={startSerial}
                                onChange={(e) => setStartSerial(Math.max(1, parseInt(e.target.value) || 1))}
                                className="h-9 text-xs"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-xs">Prefix (Optional)</Label>
                              <Input
                                placeholder="e.g. VIROS"
                                value={customPrefix}
                                onChange={(e) => setCustomPrefix(e.target.value)}
                                className="h-9 text-xs"
                              />
                            </div>
                          </div>

                          <div className="p-2.5 bg-muted/60 rounded-lg border text-xs space-y-1">
                            <span className="text-muted-foreground font-medium text-[10px]">Sample QR Value:</span>
                            <p className="font-mono font-bold text-xs text-primary break-all">
                              {customPrefix ? `${customPrefix}${delimiter === 'NONE' ? '' : delimiter}` : ''}
                              {itemConfigs[0]?.sku || 'SKU1001'}
                              {delimiter === 'NONE' ? '' : delimiter}
                              {formatDateForQR(purchase?.bill_date || purchase?.date || new Date(), dateFormat)}
                              {delimiter === 'NONE' ? '' : delimiter}
                              {serialDigits === '3' ? '001' : serialDigits === '2' ? '01' : serialDigits === '4' ? '0001' : '1'}
                            </p>
                          </div>
                        </CardContent>
                      </Card>

                      {/* COLUMN 3: ELEMENTS PRINTED ON STICKER */}
                      <Card className="shadow-sm">
                        <CardContent className="p-4 space-y-3">
                          <h4 className="text-sm font-semibold flex items-center gap-1.5 text-primary">
                            <FileText className="w-4 h-4" />
                            Elements on Sticker Label
                          </h4>

                          <div className="space-y-2.5 pt-1">
                            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                              <Checkbox
                                checked={showProductName}
                                onCheckedChange={(c) => setShowProductName(Boolean(c))}
                              />
                              Product Name
                            </label>

                            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                              <Checkbox
                                checked={showSku}
                                onCheckedChange={(c) => setShowSku(Boolean(c))}
                              />
                              SKU Code
                            </label>

                            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                              <Checkbox
                                checked={showPayload}
                                onCheckedChange={(c) => setShowPayload(Boolean(c))}
                              />
                              Full QR Combination Code
                            </label>

                            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                              <Checkbox
                                checked={showSerialBadge}
                                onCheckedChange={(c) => setShowSerialBadge(Boolean(c))}
                              />
                              Serial Number Badge (#001 (1/10))
                            </label>

                            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                              <Checkbox
                                checked={showDate}
                                onCheckedChange={(c) => setShowDate(Boolean(c))}
                              />
                              Formatted Date
                            </label>

                            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                              <Checkbox
                                checked={showPrice}
                                onCheckedChange={(c) => setShowPrice(Boolean(c))}
                              />
                              Product Rate / MRP
                            </label>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}

                {/* TAB 3: PRODUCTS & QUANTITY SELECTION */}
                {activeTab === 'list' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={(c) => toggleSelectAll(Boolean(c))}
                        />
                        Select All Products ({itemConfigs.length})
                      </label>
                      <span className="text-xs text-muted-foreground">
                        Each product unit generates 1 individual {validWidth}×{validHeight}mm sticker label
                      </span>
                    </div>

                    <div className="border rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-muted/50 border-b">
                            <tr>
                              <th className="py-2.5 px-3 text-left w-10">Select</th>
                              <th className="py-2.5 px-3 text-left">Product Name</th>
                              <th className="py-2.5 px-3 text-left w-36">SKU Code</th>
                              <th className="py-2.5 px-3 text-center w-28">Quantity (NOS)</th>
                              <th className="py-2.5 px-3 text-center w-28">QR Codes</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {itemConfigs.map((item) => (
                              <tr
                                key={item.itemId}
                                className={cn(
                                  'hover:bg-muted/30 transition-colors',
                                  !item.selected && 'opacity-50'
                                )}
                              >
                                <td className="py-2.5 px-3">
                                  <Checkbox
                                    checked={item.selected}
                                    onCheckedChange={(c) =>
                                      updateItemConfig(item.itemId, { selected: Boolean(c) })
                                    }
                                  />
                                </td>
                                <td className="py-2.5 px-3 font-medium">
                                  <div>{item.productName}</div>
                                  {item.mrp ? (
                                    <span className="text-[10px] text-muted-foreground">
                                      MRP: {formatCurrency(item.mrp)}
                                    </span>
                                  ) : null}
                                </td>
                                <td className="py-2.5 px-3">
                                  <Input
                                    value={item.sku}
                                    onChange={(e) =>
                                      updateItemConfig(item.itemId, { sku: e.target.value.toUpperCase() })
                                    }
                                    className="h-7 text-xs font-mono"
                                    placeholder="SKU Code"
                                  />
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <Input
                                    type="number"
                                    min={1}
                                    value={item.quantity}
                                    onChange={(e) =>
                                      updateItemConfig(item.itemId, {
                                        quantity: Math.max(1, parseInt(e.target.value) || 1),
                                      })
                                    }
                                    className="h-7 text-xs w-20 mx-auto text-center font-semibold"
                                  />
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <Badge variant="secondary" className="font-mono text-[11px]">
                                    {item.selected ? `${item.quantity} QRs` : '0'}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
