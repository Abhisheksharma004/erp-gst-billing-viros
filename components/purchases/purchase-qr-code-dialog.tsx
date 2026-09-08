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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  Sparkles,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Zap,
  Loader2,
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

export interface DevicePrinter {
  name: string
  isDefault: boolean
  portName: string
  driverName: string
  isThermal: boolean
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

  // Device Connected Printers
  const [devicePrinters, setDevicePrinters] = useState<DevicePrinter[]>([])
  const [selectedPrinter, setSelectedPrinter] = useState<string>('')
  const [loadingPrinters, setLoadingPrinters] = useState<boolean>(false)

  // Label Size & Roll Layout (Hardcoded 50x25 mm standard)
  const labelWidth = 50 // Hardcoded 50mm width
  const labelHeight = 25 // Hardcoded 25mm height
  const labelsAcross = 1 // Hardcoded 1-Across standard
  const [horizontalGap, setHorizontalGap] = useState<number>(2) // Gap across in mm (default 2mm)
  const [verticalGap, setVerticalGap] = useState<number>(2) // Row pitch gap in mm (default 2mm)
  const [printerLanguage, setPrinterLanguage] = useState<'TSPL' | 'ZPL'>('TSPL')
  const [printerType, setPrinterType] = useState<'DIRECT_THERMAL' | 'THERMAL_TRANSFER'>('DIRECT_THERMAL')
  const [printerDpi, setPrinterDpi] = useState<string>('300') // 300 DPI for TSC TE310, 203 DPI standard
  const [printDensity, setPrintDensity] = useState<string>('dark') // normal, dark, extra_dark
  const [sensorType, setSensorType] = useState<string>('gap') // gap, continuous, black_mark
  const [topOffset, setTopOffset] = useState<number>(0)
  const [leftOffset, setLeftOffset] = useState<number>(0)
  const [ribbonType, setRibbonType] = useState<string>('wax') // wax, wax_resin, resin
  const [previewRowIndex, setPreviewRowIndex] = useState<number>(0)

  // Direct Printing Progress State (1/10, 2/10...)
  const [directPrinting, setDirectPrinting] = useState<boolean>(false)
  const [printProgress, setPrintProgress] = useState<{
    current: number
    total: number
    statusText: string
    completed: boolean
    error?: string
  } | null>(null)

  // Code Combination controls
  const [dateFormat, setDateFormat] = useState<string>('DDMMYY')
  const [delimiter, setDelimiter] = useState<string>('-')
  const [serialDigits, setSerialDigits] = useState<string>('3') // '3' -> 001, '2' -> 01, '4' -> 0001, '1' -> 1
  const [startSerial, setStartSerial] = useState<number>(1)
  const [customPrefix, setCustomPrefix] = useState<string>('')

  // Display Options on Label - ONLY 4 Human-Readable Elements (Respectively: 1 Product, 2 Full QR, 3 & 4 Custom Fields)
  const [showProductName, setShowProductName] = useState(true)
  const [showPayload, setShowPayload] = useState(true)
  const [customNote1, setCustomNote1] = useState<string>('')
  const [showCustomNote1, setShowCustomNote1] = useState<boolean>(true)
  const [customNote2, setCustomNote2] = useState<string>('')
  const [showCustomNote2, setShowCustomNote2] = useState<boolean>(true)
  const [prnTemplateFile, setPrnTemplateFile] = useState<string>('auto')

  // Navigation tab state (self-contained)
  const [activeTab, setActiveTab] = useState<'preview' | 'configure' | 'printer' | 'list'>('preview')
  const [previewIndex, setPreviewIndex] = useState<number>(0)

  // Item configurations
  const [itemConfigs, setItemConfigs] = useState<ItemConfig[]>([])
  const [generatedLabels, setGeneratedLabels] = useState<GeneratedLabel[]>([])
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  const applyPrinterSettings = (printerName: string, printersList: DevicePrinter[] = devicePrinters) => {
    setSelectedPrinter(printerName)
    const pObj = printersList.find((p) => p.name === printerName)
    const lower = (printerName || '').toLowerCase()
    const driverLower = (pObj?.driverName || '').toLowerCase()

    const isZebra = lower.includes('zebra') || lower.includes('zdesigner') || driverLower.includes('zebra') || driverLower.includes('zdesigner')
    const is300 = lower.includes('310') || lower.includes('300') || driverLower.includes('310') || driverLower.includes('300')

    if (isZebra) {
      setPrinterLanguage('ZPL')
    } else {
      setPrinterLanguage('TSPL')
    }

    if (is300) {
      setPrinterDpi('300')
    } else {
      setPrinterDpi('203')
    }

    if (lower.includes('tsc') || driverLower.includes('tsc')) {
      setPrinterType('THERMAL_TRANSFER')
    }
  }

  // Fetch connected printers on device
  const fetchConnectedPrinters = async () => {
    setLoadingPrinters(true)
    try {
      const res = await fetch('/api/printers')
      const data = await res.json()
      if (data.printers && Array.isArray(data.printers)) {
        setDevicePrinters(data.printers)
        if (!selectedPrinter) {
          const defaultP = data.printers.find((p: DevicePrinter) => p.isDefault) || data.printers[0]
          if (defaultP) {
            applyPrinterSettings(defaultP.name, data.printers)
          }
        }
      }
    } catch (err) {
      console.error('Error fetching device printers:', err)
    } finally {
      setLoadingPrinters(false)
    }
  }

  // Fetch purchase details and device printers
  useEffect(() => {
    if (!open) return

    fetchConnectedPrinters()

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

  // Direct Printing to target printer with live progress tracking (1/10, 2/10...)
  const handleDirectPrint = async () => {
    if (generatedLabels.length === 0) return
    if (!selectedPrinter) {
      toast({
        title: 'No Printer Selected',
        description: 'Please select a connected printer in the configuration.',
        variant: 'destructive',
      })
      return
    }

    setDirectPrinting(true)
    const total = generatedLabels.length
    setPrintProgress({
      current: 1,
      total,
      statusText: `Sending ${total} labels to ${selectedPrinter}...`,
      completed: false,
    })

    try {
      // Send raw ZPL payload to printer spooler API immediately
      const res = await fetch('/api/printers/print-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          printerName: selectedPrinter,
          labels: generatedLabels,
          config: {
            printerName: selectedPrinter,
            labelWidth: 50,
            labelHeight: 25,
            labelsAcross: 1,
            horizontalGap: 2,
            verticalGap: 2,
            printerDpi,
            printDensity,
            printerLanguage,
            printerType,
            sensorType,
            showProductName,
            showPayload,
            customNote1,
            showCustomNote1,
            customNote2,
            showCustomNote2,
          },
        }),
      })

      const result = await res.json()
      if (!res.ok || result.error) {
        throw new Error(result.error || 'Direct print failed')
      }

      setPrintProgress({
        current: total,
        total,
        statusText: `✓ Successfully sent ${total} labels to ${selectedPrinter}! Printing continuously...`,
        completed: true,
      })

      toast({
        title: 'Print Command Sent!',
        description: `${total} labels sent directly to ${selectedPrinter}.`,
      })

      setTimeout(() => {
        setPrintProgress(null)
      }, 5000)
    } catch (err: any) {
      console.error('Direct print error:', err)
      setPrintProgress({
        current: 0,
        total,
        statusText: `Print Error: ${err?.message || 'Could not send raw print job'}`,
        completed: false,
        error: err?.message,
      })
      toast({
        title: 'Direct Print Issue',
        description: err?.message || 'Could not send raw print job to printer.',
        variant: 'destructive',
      })
    } finally {
      setDirectPrinting(false)
    }
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

  // Safe valid width/height & across calculations
  const validWidth = Math.max(10, Math.min(300, labelWidth || 50))
  const validHeight = Math.max(10, Math.min(300, labelHeight || 25))
  const validAcross = Math.max(1, Math.min(6, labelsAcross || 1))
  const validHGap = Math.max(0, Math.min(50, horizontalGap ?? 2))
  const validVGap = Math.max(0, Math.min(50, verticalGap ?? 2))
  const totalRollWidth = (validWidth * validAcross) + (validHGap * (validAcross - 1))

  const labelRows = useMemo(() => {
    const rows: GeneratedLabel[][] = []
    for (let i = 0; i < generatedLabels.length; i += validAcross) {
      rows.push(generatedLabels.slice(i, i + validAcross))
    }
    return rows
  }, [generatedLabels, validAcross])

  const currentSelectedPrinterObj = devicePrinters.find((p) => p.name === selectedPrinter)

  return (
    <>
      {/* Dynamic exact label size & multi-across print styles */}
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
            left: ${leftOffset}mm !important;
            top: ${topOffset}mm !important;
            width: ${totalRollWidth}mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          @page {
            size: ${totalRollWidth}mm ${validHeight}mm;
            margin: 0mm;
          }
          .qr-print-row {
            display: flex !important;
            flex-direction: row !important;
            width: ${totalRollWidth}mm !important;
            height: ${validHeight}mm !important;
            gap: ${validHGap}mm !important;
            page-break-after: always !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin: 0 0 ${validVGap}mm 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
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
            margin: 0 !important;
            border: none !important;
            background: #ffffff !important;
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            gap: 1.5mm !important;
            overflow: hidden !important;
            image-rendering: -webkit-optimize-contrast !important;
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
                    {selectedPrinter && (
                      <Badge variant="outline" className="text-[11px] font-medium text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 flex items-center gap-1">
                        <Printer className="w-3 h-3 text-blue-600" />
                        {selectedPrinter}
                      </Badge>
                    )}
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
                  onClick={handleDirectPrint}
                  disabled={totalQrCount === 0 || generating || directPrinting}
                  className="h-9 text-xs font-bold gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-sm"
                  title={`Direct print to ${selectedPrinter || 'thermal printer'}`}
                >
                  {directPrinting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                  )}
                  {directPrinting
                    ? `Printing (${printProgress?.current || 1}/${totalQrCount})...`
                    : `Direct Print (${totalQrCount})`}
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* Main Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {/* GLOBAL LIVE PRINT PROGRESS BANNER */}
            {printProgress && (
              <div
                className={cn(
                  'p-3.5 rounded-lg border text-xs space-y-2 transition-all animate-in fade-in shadow-sm',
                  printProgress.completed
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                    : printProgress.error
                    ? 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-900 dark:text-red-200'
                    : 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-200'
                )}
              >
                <div className="flex items-center justify-between font-semibold">
                  <span className="flex items-center gap-2">
                    {directPrinting ? (
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
                    ) : printProgress.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    ) : null}
                    <span>{printProgress.statusText}</span>
                  </span>
                  <Badge
                    variant={printProgress.completed ? 'default' : 'secondary'}
                    className="font-mono text-[11px]"
                  >
                    {printProgress.current} / {printProgress.total} (
                    {Math.round((printProgress.current / (printProgress.total || 1)) * 100)}%)
                  </Badge>
                </div>

                {/* Animated Progress Bar */}
                <div className="w-full bg-neutral-200 dark:bg-neutral-700 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full transition-all duration-300 rounded-full',
                      printProgress.completed
                        ? 'bg-emerald-600'
                        : printProgress.error
                        ? 'bg-red-600'
                        : 'bg-blue-600'
                    )}
                    style={{
                      width: `${Math.min(100, (printProgress.current / (printProgress.total || 1)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
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
                {/* Navigation Bar with 4 distinct segments */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-3">
                  <div className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground flex-wrap">
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
                      onClick={() => setActiveTab('printer')}
                      className={cn(
                        'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium ring-offset-background transition-all gap-1.5',
                        activeTab === 'printer'
                          ? 'bg-background text-foreground shadow font-semibold text-emerald-600 dark:text-emerald-400'
                          : 'hover:text-foreground'
                      )}
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Printer Configuration
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
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium bg-muted/60 px-2.5 py-1 rounded-md border flex-wrap">
                      <span>Label:</span>
                      <strong className="text-foreground font-mono font-semibold">
                        {validWidth}mm × {validHeight}mm
                      </strong>
                      <span className="text-muted-foreground">•</span>
                      <span>Printer:</span>
                      <strong className="text-foreground font-semibold">
                        {selectedPrinter || 'Default System Printer'}
                      </strong>
                    </div>
                  )}
                </div>

                {/* SEGMENT 1: PREVIEW */}
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

                              {/* Label Details - Strictly 4 Human-Readable Items on 50x25mm */}
                              <div className="min-w-0 flex-1 flex flex-col justify-center text-left space-y-1 leading-tight overflow-hidden">
                                {/* 1. Product Name */}
                                {showProductName && (
                                  <p className="font-bold text-[11px] truncate text-black leading-tight" title={label.productName}>
                                    {label.productName}
                                  </p>
                                )}

                                {/* 2. Full QR Combination Code */}
                                {showPayload && (
                                  <p className="font-mono text-[9px] font-bold text-black truncate select-all bg-neutral-100 px-1 py-0.5 rounded border border-neutral-200">
                                    {label.payload}
                                  </p>
                                )}

                                {/* 3. Custom Field 1 */}
                                {showCustomNote1 && customNote1.trim() && (
                                  <p className="text-[8.5px] font-semibold text-neutral-800 truncate leading-tight pt-0.5">
                                    {customNote1.trim()}
                                  </p>
                                )}

                                {/* 4. Custom Field 2 */}
                                {showCustomNote2 && customNote2.trim() && (
                                  <p className="text-[8px] text-neutral-600 truncate leading-tight">
                                    {customNote2.trim()}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* SEGMENT 2: FORMAT SETTINGS */}
                {activeTab === 'configure' && (
                  <div className="space-y-4">
                    {/* Hardcoded 50x25 mm Label Size Indicator */}
                    <div className="flex items-center justify-between p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs shadow-sm">
                      <div className="flex items-center gap-2.5">
                        <Badge variant="outline" className="font-mono font-bold text-emerald-800 dark:text-emerald-300 border-emerald-400 bg-white dark:bg-emerald-900/60 px-2.5 py-1 text-xs">
                          50 × 25 mm
                        </Badge>
                        <div>
                          <span className="font-bold text-emerald-950 dark:text-emerald-100">
                            Hardcoded Label Size: 50mm (Width) × 25mm (Height)
                          </span>
                          <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block mt-0.5">
                            Standard single label size with exactly 4 human-readable text items (Product Name, Full QR Data, Custom Field 1, Custom Field 2)
                          </span>
                        </div>
                      </div>
                      <Badge variant="secondary" className="font-mono text-[10px] hidden sm:inline-flex">
                        Fixed Dimension
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* CODE COMBINATION STRUCTURE */}
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

                      {/* ELEMENTS PRINTED ON STICKER - STRICTLY 4 HUMAN READABLE */}
                      <Card className="shadow-sm">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold flex items-center gap-1.5 text-primary">
                              <FileText className="w-4 h-4" />
                              Elements on Sticker Label
                            </h4>
                            <Badge variant="secondary" className="text-[10px] font-mono">
                              4 Human Readable Only
                            </Badge>
                          </div>

                          <div className="space-y-3 pt-1">
                            {/* 1. Product Name */}
                            <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border">
                              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                                <Checkbox
                                  checked={showProductName}
                                  onCheckedChange={(c) => setShowProductName(Boolean(c))}
                                />
                                <span>1. Product Name</span>
                              </label>
                              <Badge variant="outline" className="text-[10px] font-mono py-0 text-muted-foreground">Line 1</Badge>
                            </div>

                            {/* 2. Full QR Combination Code */}
                            <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border">
                              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                                <Checkbox
                                  checked={showPayload}
                                  onCheckedChange={(c) => setShowPayload(Boolean(c))}
                                />
                                <span>2. Full QR Data</span>
                              </label>
                              <Badge variant="outline" className="text-[10px] font-mono py-0 text-muted-foreground">Line 2</Badge>
                            </div>

                            {/* 3. Custom Field 1 */}
                            <div className="p-2.5 rounded-lg bg-muted/40 border space-y-2">
                              <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                                  <Checkbox
                                    checked={showCustomNote1}
                                    onCheckedChange={(c) => setShowCustomNote1(Boolean(c))}
                                  />
                                  <span>3. Custom Field 1</span>
                                </label>
                                <Badge variant="outline" className="text-[10px] font-mono py-0 text-muted-foreground">Line 3</Badge>
                              </div>
                              {showCustomNote1 && (
                                <Input
                                  placeholder="Enter Custom Field 1 (e.g. Batch No / QC OK)"
                                  value={customNote1}
                                  onChange={(e) => setCustomNote1(e.target.value)}
                                  className="h-8 text-xs bg-background"
                                />
                              )}
                            </div>

                            {/* 4. Custom Field 2 */}
                            <div className="p-2.5 rounded-lg bg-muted/40 border space-y-2">
                              <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                                  <Checkbox
                                    checked={showCustomNote2}
                                    onCheckedChange={(c) => setShowCustomNote2(Boolean(c))}
                                  />
                                  <span>4. Custom Field 2</span>
                                </label>
                                <Badge variant="outline" className="text-[10px] font-mono py-0 text-muted-foreground">Line 4</Badge>
                              </div>
                              {showCustomNote2 && (
                                <Input
                                  placeholder="Enter Custom Field 2 (e.g. Grade / Inspector / Note)"
                                  value={customNote2}
                                  onChange={(e) => setCustomNote2(e.target.value)}
                                  className="h-8 text-xs bg-background"
                                />
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}

                {/* SEGMENT 3: PRINTER CONFIGURATION */}
                {activeTab === 'printer' && (
                  <div className="space-y-4">
                    {/* CONNECTED PRINTERS & DIRECT PRINT COMMAND CARD */}
                    <Card className="shadow-sm border-blue-200 dark:border-blue-900/60 bg-blue-50/20 dark:bg-blue-950/10">
                      <CardHeader className="pb-2 pt-4 px-4">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-blue-700 dark:text-blue-400">
                            <Printer className="w-4 h-4" />
                            Connected Device Printers & Print Command
                          </CardTitle>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={fetchConnectedPrinters}
                            disabled={loadingPrinters}
                            className="h-7 text-xs gap-1"
                          >
                            <RefreshCw className={cn('w-3 h-3', loadingPrinters && 'animate-spin')} />
                            Rescan Devices
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-1 space-y-3.5">
                        {/* LIVE PRINTING STATUS BANNER (1/10, 2/10...) */}
                        {printProgress && (
                          <div className={cn(
                            'p-3.5 rounded-lg border text-xs space-y-2 transition-all animate-in fade-in',
                            printProgress.completed
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                              : printProgress.error
                              ? 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-900 dark:text-red-200'
                              : 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-200'
                          )}>
                            <div className="flex items-center justify-between font-semibold">
                              <span className="flex items-center gap-1.5">
                                {directPrinting ? (
                                  <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
                                ) : printProgress.completed ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                ) : null}
                                {printProgress.statusText}
                              </span>
                              <Badge variant={printProgress.completed ? 'default' : 'secondary'} className="font-mono text-[11px]">
                                {printProgress.current} / {printProgress.total} ({Math.round((printProgress.current / (printProgress.total || 1)) * 100)}%)
                              </Badge>
                            </div>

                            {/* Animated Progress Bar */}
                            <div className="w-full bg-neutral-200 dark:bg-neutral-700 h-2 rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  'h-full transition-all duration-200 rounded-full',
                                  printProgress.completed
                                    ? 'bg-emerald-600'
                                    : printProgress.error
                                    ? 'bg-red-600'
                                    : 'bg-blue-600'
                                )}
                                style={{
                                  width: `${Math.min(100, (printProgress.current / (printProgress.total || 1)) * 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                        )}

                        {/* PARALLEL DESIGN: Left = Printer Selection & Details | Right = Print & Preview Buttons */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                          {/* LEFT COLUMN (Printer Selection & Details) */}
                          <div className="lg:col-span-7 space-y-2.5">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold">Select Target Printer for Output</Label>
                              {devicePrinters.length > 0 ? (
                                <Select value={selectedPrinter} onValueChange={(val) => applyPrinterSettings(val)}>
                                  <SelectTrigger className="h-9 text-xs bg-background">
                                    <SelectValue placeholder="Choose printer..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {devicePrinters.map((p) => (
                                      <SelectItem key={p.name} value={p.name} className="text-xs">
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium">{p.name}</span>
                                          {p.isDefault && (
                                            <Badge variant="secondary" className="text-[10px] py-0 px-1">
                                              Default
                                            </Badge>
                                          )}
                                          {p.isThermal && (
                                            <Badge variant="outline" className="text-[10px] py-0 px-1 text-emerald-700 border-emerald-300">
                                              Thermal
                                            </Badge>
                                          )}
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <p className="text-xs text-muted-foreground">
                                  {loadingPrinters ? 'Scanning connected devices...' : 'No system printers detected. Using system default.'}
                                </p>
                              )}
                            </div>

                            {/* Printer Command Language & DPI Bar */}
                            <div className="grid grid-cols-2 gap-2 p-2 bg-muted/40 rounded-lg border text-xs">
                              <div className="space-y-1">
                                <span className="text-[10px] font-semibold text-muted-foreground block">Command Language</span>
                                <Select value={printerLanguage} onValueChange={(val: 'TSPL' | 'ZPL') => setPrinterLanguage(val)}>
                                  <SelectTrigger className="h-7 text-[11px] bg-background">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="TSPL" className="text-xs">TSPL (TSC / TVS / Xprinter)</SelectItem>
                                    <SelectItem value="ZPL" className="text-xs">ZPL (Zebra / ZDesigner)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1">
                                <span className="text-[10px] font-semibold text-muted-foreground block">Resolution (DPI)</span>
                                <Select value={printerDpi} onValueChange={setPrinterDpi}>
                                  <SelectTrigger className="h-7 text-[11px] bg-background">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="300" className="text-xs">300 DPI (TSC TE310 / Hi-Res)</SelectItem>
                                    <SelectItem value="203" className="text-xs">203 DPI (Standard 8 dots/mm)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            {/* Selected Printer Status Details */}
                            {currentSelectedPrinterObj && (
                              <div className="p-2.5 bg-background rounded-lg border text-xs grid grid-cols-2 sm:grid-cols-4 gap-2">
                                <div>
                                  <span className="text-[10px] text-muted-foreground block">Port</span>
                                  <span className="font-mono font-semibold text-[11px] truncate block" title={currentSelectedPrinterObj.portName}>
                                    {currentSelectedPrinterObj.portName || 'USB / Network'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-muted-foreground block">Driver</span>
                                  <span className="truncate font-medium text-[11px] block" title={currentSelectedPrinterObj.driverName}>
                                    {currentSelectedPrinterObj.driverName || 'Generic'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-muted-foreground block">Printer Type</span>
                                  <span className="font-medium text-[11px] text-emerald-700 dark:text-emerald-400 block truncate">
                                    {currentSelectedPrinterObj.isThermal ? 'Barcode / Thermal' : 'Standard Document'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-muted-foreground block">Connection</span>
                                  <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold text-[11px]">
                                    <CheckCircle2 className="w-3 h-3" /> Ready
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* RIGHT COLUMN (Print and Preview Action Buttons) */}
                          <div className="lg:col-span-5 flex flex-col justify-center gap-2.5">
                            {/* Primary Direct Print Button */}
                            <Button
                              variant="default"
                              size="lg"
                              onClick={handleDirectPrint}
                              disabled={totalQrCount === 0 || generating || directPrinting}
                              className="w-full h-12 text-xs font-bold gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md transition-all active:scale-[0.99]"
                            >
                              {directPrinting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                              )}
                              {directPrinting
                                ? `Direct Printing (${printProgress?.current || 1}/${totalQrCount})...`
                                : `Direct Print (${totalQrCount} Labels • 50×25mm)`}
                            </Button>

                            {/* Full Preview Button */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setActiveTab('preview')}
                              className="w-full h-9 text-xs font-medium gap-1.5 border-primary/30 hover:bg-primary/5 text-primary"
                            >
                              <Eye className="w-3.5 h-3.5 text-primary" />
                              Full Preview ({totalQrCount})
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* LIVE VISUAL LABEL PRINT PREVIEW (REAL SCALE MULTI-ACROSS MOCKUP) */}
                    <Card className="shadow-sm border-neutral-300 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30">
                      <CardHeader className="pb-2 pt-4 px-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-emerald-600" />
                            Live Label Print Preview ({validAcross} Across Real Visual Mockup)
                          </CardTitle>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-[11px] font-mono font-medium text-emerald-700 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40">
                              Single: {validWidth}×{validHeight}mm
                            </Badge>
                            <Badge variant="secondary" className="text-[11px] font-mono font-semibold">
                              {validAcross} Across • Total Roll: {totalRollWidth}mm
                            </Badge>
                            {labelRows.length > 1 && (
                              <div className="flex items-center gap-1 bg-background border rounded-md px-1.5 py-0.5">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  disabled={previewRowIndex <= 0}
                                  onClick={() => setPreviewRowIndex((prev) => Math.max(0, prev - 1))}
                                >
                                  <ChevronLeft className="w-3.5 h-3.5" />
                                </Button>
                                <span className="text-[11px] font-mono px-1 font-medium">
                                  Row {previewRowIndex + 1} / {labelRows.length}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  disabled={previewRowIndex >= labelRows.length - 1}
                                  onClick={() => setPreviewRowIndex((prev) => Math.min(labelRows.length - 1, prev + 1))}
                                >
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-1 space-y-3">
                        {generating ? (
                          <div className="py-8 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                            <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
                            <p className="text-xs">Rendering label preview...</p>
                          </div>
                        ) : generatedLabels.length === 0 ? (
                          <div className="py-8 text-center text-muted-foreground">
                            <p className="text-xs">No items selected to preview.</p>
                          </div>
                        ) : (
                          (() => {
                            const currentRow = labelRows[previewRowIndex] || labelRows[0] || []
                            return (
                              <div className="flex flex-col items-center justify-center gap-3">
                                {/* Dimension Caliper - Top Total Roll Width */}
                                <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground font-mono font-medium w-full max-w-[650px]">
                                  <span className="h-[1px] flex-1 bg-neutral-300 dark:bg-neutral-700" />
                                  <span>
                                    ↔ Total Roll Carrier Width: {totalRollWidth} mm ({validAcross} Across: {validAcross} × {validWidth}mm {validAcross > 1 ? `+ ${validHGap}mm gap` : ''})
                                  </span>
                                  <span className="h-[1px] flex-1 bg-neutral-300 dark:bg-neutral-700" />
                                </div>

                                {/* Visual Label Roll Row Mockup */}
                                <div className="flex items-center gap-3 w-full justify-center overflow-x-auto p-2">
                                  {/* Dimension Caliper - Left Height */}
                                  <div className="flex flex-col items-center justify-center gap-1 text-[10px] text-muted-foreground font-mono font-medium shrink-0">
                                    <span className="w-[1px] h-6 bg-neutral-300 dark:bg-neutral-700" />
                                    <span className="[writing-mode:vertical-lr] rotate-180">Height: {validHeight} mm</span>
                                    <span className="w-[1px] h-6 bg-neutral-300 dark:bg-neutral-700" />
                                  </div>

                                  {/* Carrier Roll Liner Background */}
                                  <div
                                    className="p-3 bg-amber-100/40 dark:bg-amber-950/20 border border-amber-300/60 dark:border-amber-800/40 rounded-xl shadow-inner flex items-center justify-center"
                                    style={{
                                      gap: `${Math.max(6, validHGap * 3.5)}px`,
                                    }}
                                  >
                                    {currentRow.map((label, idx) => (
                                      <div key={label.id} className="flex items-center gap-2">
                                        {/* Physical Label Mockup Box */}
                                        <div
                                          className="w-[280px] sm:w-[320px] bg-white text-neutral-900 border-2 border-neutral-400 rounded-lg p-2.5 shadow-md flex items-center gap-2.5 transition-all relative overflow-hidden shrink-0"
                                          style={{
                                            minHeight: `${Math.max(85, validHeight * 2.7)}px`,
                                          }}
                                        >
                                          {/* Thermal Sticker Corner Notch / Peel Marker */}
                                          <div className="absolute top-0 right-0 w-3 h-3 bg-neutral-100 border-b border-l border-neutral-300 rounded-bl" />

                                          {/* QR Code */}
                                          <div className="shrink-0 bg-white p-1 rounded border border-neutral-200 flex items-center justify-center">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                              src={label.qrDataUrl}
                                              alt={label.payload}
                                              className="w-[72px] h-[72px] min-w-[72px] min-h-[72px] object-contain"
                                            />
                                          </div>

                                          {/* Label Content - Strictly 4 Human-Readable Items */}
                                          <div className="min-w-0 flex-1 flex flex-col justify-center text-left space-y-1 leading-tight overflow-hidden">
                                            {/* 1. Product Name */}
                                            {showProductName && (
                                              <p className="font-bold text-[11px] truncate text-black leading-tight" title={label.productName}>
                                                {label.productName}
                                              </p>
                                            )}

                                            {/* 2. Full QR Combination Code */}
                                            {showPayload && (
                                              <p className="font-mono text-[9px] font-bold text-black truncate select-all bg-neutral-100 px-1 py-0.5 rounded border border-neutral-200">
                                                {label.payload}
                                              </p>
                                            )}

                                            {/* 3. Custom Field 1 */}
                                            {showCustomNote1 && customNote1.trim() && (
                                              <p className="text-[8.5px] font-semibold text-neutral-800 truncate leading-tight pt-0.5">
                                                {customNote1.trim()}
                                              </p>
                                            )}

                                            {/* 4. Custom Field 2 */}
                                            {showCustomNote2 && customNote2.trim() && (
                                              <p className="text-[8px] text-neutral-600 truncate leading-tight">
                                                {customNote2.trim()}
                                              </p>
                                            )}
                                          </div>
                                        </div>

                                        {/* Horizontal Gap Marker between labels */}
                                        {idx < currentRow.length - 1 && (
                                          <div className="flex flex-col items-center justify-center text-[9px] font-mono text-amber-800 dark:text-amber-400 font-semibold px-1 py-4 border border-dashed border-amber-400 rounded bg-amber-50 dark:bg-amber-950/60 shrink-0">
                                            <span>{validHGap}mm</span>
                                            <span className="text-[8px]">gap</span>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <p className="text-[11px] text-muted-foreground text-center">
                                  Visual preview showing Row {previewRowIndex + 1} with {validAcross} labels across on {selectedPrinter || 'target printer'} (Total Roll Width: {totalRollWidth}mm).
                                </p>
                              </div>
                            )
                          })()
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* SEGMENT 4: PRODUCTS & QUANTITY SELECTION */}
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
