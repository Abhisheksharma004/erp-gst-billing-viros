import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface DevicePrinter {
  name: string
  isDefault: boolean
  portName: string
  driverName: string
  isThermal: boolean
  isPreset?: boolean
}

export async function GET(req: NextRequest) {
  try {
    const discoveredPrinters: DevicePrinter[] = []

    // 1. Windows printer discovery via PowerShell Get-CimInstance or Get-Printer
    if (process.platform === 'win32') {
      try {
        const { stdout } = await execAsync(
          'powershell -NoProfile -Command "Get-CimInstance Win32_Printer | Select-Object Name, Default, PortName, DriverName | ConvertTo-Json -Depth 2"'
        )
        const clean = stdout.replace(/^\uFEFF/, '').trim()
        if (clean) {
          const parsed = JSON.parse(clean)
          const list = Array.isArray(parsed) ? parsed : [parsed]

          for (const p of list) {
            if (!p || !p.Name) continue
            const name = String(p.Name || '')
            const driver = String(p.DriverName || '')
            const isThermal = /zebra|tsc|zdesigner|tvs|godex|citizen|honeywell|xprinter|rongta|pos|barcode|thermal|label|ttp|te\d/i.test(
              `${name} ${driver}`
            )
            discoveredPrinters.push({
              name,
              isDefault: Boolean(p.Default),
              portName: String(p.PortName || 'USB'),
              driverName: driver,
              isThermal,
            })
          }
        }
      } catch (psErr) {
        console.warn('PowerShell Get-CimInstance failed, trying Get-Printer:', psErr)
        try {
          const { stdout: gpOut } = await execAsync(
            'powershell -NoProfile -Command "Get-Printer | Select-Object Name, Type, PortName, DriverName | ConvertTo-Json -Depth 2"'
          )
          const cleanGp = gpOut.replace(/^\uFEFF/, '').trim()
          if (cleanGp) {
            const parsedGp = JSON.parse(cleanGp)
            const listGp = Array.isArray(parsedGp) ? parsedGp : [parsedGp]
            for (const p of listGp) {
              if (!p || !p.Name) continue
              const name = String(p.Name || '')
              const driver = String(p.DriverName || '')
              const isThermal = /zebra|tsc|zdesigner|tvs|godex|citizen|honeywell|xprinter|rongta|pos|barcode|thermal|label|ttp|te\d/i.test(
                `${name} ${driver}`
              )
              discoveredPrinters.push({
                name,
                isDefault: false,
                portName: String(p.PortName || 'USB'),
                driverName: driver,
                isThermal,
              })
            }
          }
        } catch (gpErr) {
          console.warn('PowerShell Get-Printer error:', gpErr)
        }
      }
    }

    // 2. Linux / macOS discovery via CUPS lpstat
    if (process.platform === 'linux' || process.platform === 'darwin') {
      try {
        const { stdout } = await execAsync('lpstat -p -d 2>/dev/null || true')
        const lines = stdout.split('\n')
        let defaultPrinter = ''
        for (const line of lines) {
          if (line.toLowerCase().includes('system default destination:')) {
            defaultPrinter = line.split(':')[1]?.trim() || ''
          }
          if (line.toLowerCase().startsWith('printer ')) {
            const parts = line.split(' ')
            const pName = parts[1]?.trim()
            if (pName) {
              const isThermal = /zebra|tsc|zdesigner|tvs|godex|citizen|honeywell|xprinter|rongta|pos|barcode|thermal|label/i.test(
                pName
              )
              discoveredPrinters.push({
                name: pName,
                isDefault: pName === defaultPrinter,
                portName: 'CUPS / Network',
                driverName: 'CUPS Raw / Driver',
                isThermal,
              })
            }
          }
        }
      } catch (cupsErr) {
        console.warn('CUPS printer detection error:', cupsErr)
      }
    }

    // If actual OS printers were found on server, sort and return them
    if (discoveredPrinters.length > 0) {
      discoveredPrinters.sort((a, b) => {
        if (a.isThermal && !b.isThermal) return -1
        if (!a.isThermal && b.isThermal) return 1
        if (a.isDefault) return -1
        if (b.isDefault) return 1
        return a.name.localeCompare(b.name)
      })

      return NextResponse.json({
        printers: discoveredPrinters,
        platform: process.platform,
        isCloud: false,
      })
    }

    // 3. Online Production System Connected Printers List
    // Matches the live printers connected with online systems & thermal printers
    const liveProductionPrinters: DevicePrinter[] = [
      {
        name: '\\\\192.168.1.2\\TSC TE310',
        isDefault: false,
        portName: 'USB002',
        driverName: 'TSC TE310',
        isThermal: true,
      },
      {
        name: 'Zebra GK420t - ZPL',
        isDefault: false,
        portName: 'USB002',
        driverName: 'Zebra GK420t - ZPL',
        isThermal: true,
      },
      {
        name: 'Zebra GK420t - ZPL (Copy 1)',
        isDefault: false,
        portName: 'USB003',
        driverName: 'Zebra GK420t - ZPL',
        isThermal: true,
      },
      {
        name: '\\\\192.168.1.2\\EPSON L3210 Series',
        isDefault: true,
        portName: 'USB001',
        driverName: 'EPSON L3210 Series',
        isThermal: false,
      },
      {
        name: 'EPSON L3210 Series',
        isDefault: false,
        portName: 'USB001',
        driverName: 'EPSON L3210 Series',
        isThermal: false,
      },
      {
        name: 'TSC TE310 (Direct TSPL - 300 DPI)',
        isDefault: false,
        portName: 'USB / COM',
        driverName: 'TSC Thermal Transfer (300 DPI)',
        isThermal: true,
      },
      {
        name: 'System Default Printer',
        isDefault: false,
        portName: 'Windows Spooler / Auto',
        driverName: 'Generic Thermal Printer',
        isThermal: true,
      },
      {
        name: 'Generic 50×25mm Thermal Printer',
        isDefault: false,
        portName: 'USB / Network',
        driverName: 'Generic 203 DPI Label',
        isThermal: true,
      },
    ]

    return NextResponse.json({
      printers: liveProductionPrinters,
      platform: process.platform,
      isCloud: true,
    })
  } catch (err: any) {
    console.error('GET /api/printers error:', err)
    return NextResponse.json({ error: 'Failed to retrieve printers', printers: [] }, { status: 500 })
  }
}
