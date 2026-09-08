export interface LabelItemPayload {
  id: string
  payload: string
  productName: string
  sku: string
  serialNumber: number
  totalInBatch: number
  formattedSerial: string
  dateString: string
  mrp?: number | null
  rate?: number
}

export interface DirectPrintConfig {
  printerName: string
  labelWidth: number // mm (e.g. 50)
  labelHeight: number // mm (e.g. 25)
  labelsAcross: number // 1, 2, 3...
  horizontalGap: number // mm (e.g. 2)
  verticalGap: number // mm (e.g. 2)
  printerDpi?: string // 203, 300
  printDensity?: string // normal, dark, extra_dark
  printerLanguage?: 'TSPL' | 'ZPL'
  printerType?: string // DIRECT_THERMAL, THERMAL_TRANSFER
  showProductName?: boolean
  showSku?: boolean
  showPayload?: boolean
  showSerialBadge?: boolean
  showDate?: boolean
  showPrice?: boolean
  customNote1?: string
  showCustomNote1?: boolean
  customNote2?: string
  showCustomNote2?: boolean
}

/**
 * Universal label template compiler (ZPL II and TSPL standard)
 * Populates placeholders for 50x25mm label with:
 * 1. Product Name
 * 2. Full QR Payload
 * 3. Custom Field 1
 * 4. Custom Field 2
 * And the QR Code itself
 */
export function renderPrnTemplate(
  template: string,
  rowLabels: LabelItemPayload[],
  config: DirectPrintConfig,
  isFirstRow: boolean = true
): string {
  const l1 = rowLabels[0] || ({} as LabelItemPayload)
  const isZpl = template.includes('^XA')

  if (isZpl) {
    const zplDensity = config.printDensity === 'extra_dark' ? '25' : config.printDensity === 'dark' ? '18' : '12'
    const cleanName = (l1.productName || '').replace(/[\^~]/g, '').replace(/[\r\n\t]/g, ' ').slice(0, 24).trim()
    const cleanPayload = (l1.payload || '').replace(/[\^~]/g, '').replace(/[\r\n\t]/g, '').trim()
    const custom1_text = config.showCustomNote1 && config.customNote1 ? config.customNote1.replace(/[\^~]/g, '').replace(/[\r\n\t]/g, ' ').slice(0, 26).trim() : ''
    const custom2_text = config.showCustomNote2 && config.customNote2 ? config.customNote2.replace(/[\^~]/g, '').replace(/[\r\n\t]/g, ' ').slice(0, 26).trim() : ''

    let rendered = template
    rendered = rendered.replace(/\{\{DENSITY\}\}/g, zplDensity)
    rendered = rendered.replace(/\{\{QR_DATA\}\}/g, cleanPayload)
    rendered = rendered.replace(/\{\{PRODUCT_NAME\}\}/g, config.showProductName !== false ? cleanName : '')
    rendered = rendered.replace(/\{\{PAYLOAD\}\}/g, config.showPayload !== false ? cleanPayload : '')
    rendered = rendered.replace(/\{\{CUSTOM_1\}\}/g, custom1_text)
    rendered = rendered.replace(/\{\{CUSTOM_2\}\}/g, custom2_text)

    // Remove empty text lines in ZPL (e.g. ^FO...^FD^FS)
    const lines = rendered.split(/\r?\n/)
    rendered = lines
      .filter((line) => {
        const trimmed = line.trim()
        if (trimmed.endsWith('^FD^FS')) return false
        return true
      })
      .join('\r\n')

    if (!rendered.endsWith('\n') && !rendered.endsWith('\r\n')) {
      rendered += '\r\n'
    }
    return rendered
  }

  // TSPL format handler (standard 50x25mm)
  const dpi = parseInt(config.printerDpi || '203') || 203
  const is300Dpi = dpi === 300
  const density = config.printDensity === 'extra_dark' ? 14 : config.printDensity === 'dark' ? 11 : 8

  let rendered = template
  rendered = rendered.replace(/\{\{WIDTH\}\}/g, String(config.labelWidth || 50))
  rendered = rendered.replace(/\{\{HEIGHT\}\}/g, String(config.labelHeight || 25))
  rendered = rendered.replace(/\{\{TOTAL_WIDTH\}\}/g, String(config.labelWidth || 50))
  rendered = rendered.replace(/\{\{VGAP\}\}/g, String(config.verticalGap ?? 2))
  rendered = rendered.replace(/\{\{HGAP\}\}/g, String(config.horizontalGap ?? 2))
  rendered = rendered.replace(/\{\{DENSITY\}\}/g, String(density))

  // Sizing & coordinates scaled for 203 DPI vs 300 DPI
  const qrX = is300Dpi ? 24 : 16
  const qrY = is300Dpi ? 30 : 20
  const qrSize = is300Dpi ? 6 : 4
  const textX = is300Dpi ? 225 : 152

  const yName = is300Dpi ? 30 : 20
  const yPayload = is300Dpi ? 95 : 62
  const yCustom1 = is300Dpi ? 155 : 102
  const yCustom2 = is300Dpi ? 215 : 142

  const fontName = is300Dpi ? '4' : '3'
  const fontBody = is300Dpi ? '3' : '2'
  const fontNote = is300Dpi ? '3' : '2'

  rendered = rendered.replace(/\{\{QR_X\}\}/g, String(qrX))
  rendered = rendered.replace(/\{\{QR_Y\}\}/g, String(qrY))
  rendered = rendered.replace(/\{\{QR_SIZE\}\}/g, String(qrSize))
  rendered = rendered.replace(/\{\{TEXT_X\}\}/g, String(textX))

  rendered = rendered.replace(/\{\{Y_NAME\}\}/g, String(yName))
  rendered = rendered.replace(/\{\{Y_PAYLOAD\}\}/g, String(yPayload))
  rendered = rendered.replace(/\{\{Y_CUSTOM1\}\}/g, String(yCustom1))
  rendered = rendered.replace(/\{\{Y_CUSTOM2\}\}/g, String(yCustom2))

  rendered = rendered.replace(/\{\{FONT_NAME\}\}/g, fontName)
  rendered = rendered.replace(/\{\{FONT_BODY\}\}/g, fontBody)
  rendered = rendered.replace(/\{\{FONT_NOTE\}\}/g, fontNote)

  const cleanName1 = (l1.productName || '').replace(/"/g, "'").replace(/[\r\n]/g, ' ').slice(0, 24)
  const cleanPayload1 = (l1.payload || '').replace(/"/g, '').replace(/[\r\n\t]/g, '').trim()
  const custom1_text = config.showCustomNote1 && config.customNote1 ? config.customNote1.replace(/"/g, "'").replace(/[\r\n]/g, ' ').slice(0, 26) : ''
  const custom2_text = config.showCustomNote2 && config.customNote2 ? config.customNote2.replace(/"/g, "'").replace(/[\r\n]/g, ' ').slice(0, 26) : ''

  rendered = rendered.replace(/\{\{QR_DATA\}\}/g, cleanPayload1)
  rendered = rendered.replace(/\{\{PRODUCT_NAME\}\}/g, config.showProductName !== false ? cleanName1 : '')
  rendered = rendered.replace(/\{\{PAYLOAD\}\}/g, config.showPayload !== false ? cleanPayload1 : '')
  rendered = rendered.replace(/\{\{CUSTOM_1\}\}/g, custom1_text)
  rendered = rendered.replace(/\{\{CUSTOM_2\}\}/g, custom2_text)

  // Legacy unused tags set to empty
  rendered = rendered.replace(/\{\{SKU\}\}/g, '')
  rendered = rendered.replace(/\{\{SERIAL\}\}/g, '')
  rendered = rendered.replace(/\{\{CURRENT\}\}/g, '')
  rendered = rendered.replace(/\{\{TOTAL\}\}/g, '')
  rendered = rendered.replace(/\{\{DATE\}\}/g, '')
  rendered = rendered.replace(/\{\{PRICE_LABEL\}\}/g, '')

  if (!isFirstRow) {
    const lines = rendered.split(/\r?\n/)
    rendered = lines
      .filter((line) => {
        const trimmed = line.trim().toUpperCase()
        return !(
          trimmed.startsWith('SIZE ') ||
          trimmed.startsWith('GAP ') ||
          trimmed.startsWith('SPEED ') ||
          trimmed.startsWith('DENSITY ') ||
          trimmed.startsWith('DIRECTION ') ||
          trimmed.startsWith('REFERENCE ') ||
          trimmed.startsWith('SET PEEL ') ||
          trimmed.startsWith('SET CUTTER ') ||
          trimmed.startsWith('SET TEAR ') ||
          trimmed.startsWith('OFFSET ')
        )
      })
      .join('\r\n')
  }

  const lines = rendered.split(/\r?\n/)
  rendered = lines
    .filter((line) => {
      const trimmed = line.trim()
      if (trimmed.startsWith('TEXT ') && trimmed.endsWith('""')) return false
      return true
    })
    .join('\r\n')

  if (!rendered.endsWith('\n') && !rendered.endsWith('\r\n')) {
    rendered += '\r\n'
  }

  return rendered
}
