import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import {
  DirectPrintConfig,
  LabelItemPayload,
  renderPrnTemplate,
} from '@/lib/thermal-command-generator'

const execAsync = promisify(exec)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      printerName,
      labels,
      config,
    }: {
      printerName: string
      labels: LabelItemPayload[]
      config: DirectPrintConfig
    } = body

    if (!printerName) {
      return NextResponse.json({ error: 'No printer specified' }, { status: 400 })
    }

    if (!labels || !Array.isArray(labels) || labels.length === 0) {
      return NextResponse.json({ error: 'No labels to print' }, { status: 400 })
    }

    // Single 1-across standard: every label is printed sequentially in continuous roll mode
    const templatesDir = path.join(process.cwd(), 'templates', 'labels')
    const zplFilePath = path.join(templatesDir, 'label.zpl')
    const prnFilePath = path.join(templatesDir, 'label.prn')

    // Determine printer command language:
    // 1. Explicit config (config.printerLanguage)
    // 2. Auto-detect from printer name (Zebra -> ZPL, TSC/TVS/others -> TSPL)
    const printerLower = (printerName || '').toLowerCase()
    const isZebra = /zebra|zdesigner|zd\d|zt\d|gk\d|gx\d|gt\d/i.test(printerLower)
    const isTsc = /tsc|te\d|da\d|ttp|tvs|xprinter|gprinter/i.test(printerLower)

    let isZpl = false
    if (config?.printerLanguage === 'ZPL') {
      isZpl = true
    } else if (config?.printerLanguage === 'TSPL') {
      isZpl = false
    } else if (isZebra) {
      isZpl = true
    } else {
      // Default to TSPL (label.prn) for TSC TE310 and other thermal printers
      isZpl = false
    }

    // Auto-detect DPI if not specified in config
    const is300 = printerLower.includes('310') || printerLower.includes('300')
    const effectiveDpi = config?.printerDpi || (is300 ? '300' : '203')

    const templateFileName = isZpl ? 'label.zpl' : 'label.prn'
    const templateFilePath = path.join(templatesDir, templateFileName)

    let template = ''
    if (fs.existsSync(templateFilePath)) {
      template = fs.readFileSync(templateFilePath, 'utf8')
    } else {
      // Fallback
      if (isZpl) {
        template =
          '^XA\r\n^PW400\r\n^LL200\r\n^LH0,0\r\n^LS0\r\n^PR4,4\r\n^MD15\r\n^FO20,24^BQN,2,4,M,7^FDMM,A{{QR_DATA}}^FS\r\n^FO150,20^A0N,22,22^FD{{PRODUCT_NAME}}^FS\r\n^FO150,54^A0N,20,20^FD{{PAYLOAD}}^FS\r\n^FO150,88^A0N,20,20^FD{{CUSTOM_1}}^FS\r\n^FO150,122^A0N,20,20^FD{{CUSTOM_2}}^FS\r\n^PQ1,0,1,Y\r\n^XZ\r\n'
      } else {
        template =
          'SIZE 50 mm, 25 mm\r\nGAP {{VGAP}} mm, 0 mm\r\nSPEED 4\r\nDENSITY {{DENSITY}}\r\nDIRECTION 1\r\nREFERENCE 0,0\r\nSET PEEL OFF\r\nSET CUTTER OFF\r\nSET TEAR ON\r\nCLS\r\nQRCODE {{QR_X}},{{QR_Y}},M,{{QR_SIZE}},A,0,"{{QR_DATA}}"\r\nTEXT {{TEXT_X}},{{Y_NAME}},"{{FONT_NAME}}",0,1,1,"{{PRODUCT_NAME}}"\r\nTEXT {{TEXT_X}},{{Y_PAYLOAD}},"{{FONT_BODY}}",0,1,1,"{{PAYLOAD}}"\r\nTEXT {{TEXT_X}},{{Y_CUSTOM1}},"{{FONT_NOTE}}",0,1,1,"{{CUSTOM_1}}"\r\nTEXT {{TEXT_X}},{{Y_CUSTOM2}},"{{FONT_NOTE}}",0,1,1,"{{CUSTOM_2}}"\r\nPRINT 1,1\r\n'
      }
    }

    // Build raw continuous command stream for all labels
    let fullCommand = ''
    for (const [index, label] of labels.entries()) {
      fullCommand += renderPrnTemplate(
        template,
        [label],
        {
          ...config,
          printerName,
          printerDpi: effectiveDpi,
          labelsAcross: 1,
        },
        index === 0
      )
    }

    // Send compiled ZPL/PRN stream directly to whichever printer is selected
    if (process.platform === 'win32') {
      const scriptPath = path.join(process.cwd(), 'scripts', 'send-raw-print.ps1')
      const tempDir = os.tmpdir()
      const ext = isZpl ? 'zpl' : 'prn'
      const tempFile = path.join(
        tempDir,
        `label_print_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`
      )

      fs.writeFileSync(tempFile, fullCommand, { encoding: 'utf8' })

      try {
        const psCommand = `powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}" -PrinterName "${printerName.replace(/"/g, '`"')}" -FilePath "${tempFile.replace(/"/g, '`"')}"`
        const { stdout, stderr } = await execAsync(psCommand)

        try {
          if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile)
        } catch {}

        const isSuccess = stdout.toLowerCase().includes('true') || !stderr

        if (!isSuccess && stderr) {
          console.error('Printer spooler stderr:', stderr)
          return NextResponse.json(
            { error: `Printer spooler error: ${stderr}` },
            { status: 500 }
          )
        }

        const templateName = isZpl ? 'label.zpl' : 'label.prn'
        return NextResponse.json({
          success: true,
          printedCount: labels.length,
          printerName,
          templateFile: templateName,
          rawCommand: fullCommand,
        })
      } catch (execErr: any) {
        try {
          if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile)
        } catch {}
        console.error('Execution error sending print job:', execErr)
        return NextResponse.json(
          { error: `Failed to send print command to ${printerName}: ${execErr.message}` },
          { status: 500 }
        )
      }
    }

    const templateName = isZpl ? 'label.zpl' : 'label.prn'
    return NextResponse.json({
      success: true,
      printedCount: labels.length,
      simulated: true,
      clientPrintRequired: true,
      printerName,
      templateFile: templateName,
      rawCommand: fullCommand,
    })
  } catch (err: any) {
    console.error('Direct print error:', err)
    return NextResponse.json(
      { error: `Direct print failed: ${err?.message || 'Unknown error'}` },
      { status: 500 }
    )
  }
}
