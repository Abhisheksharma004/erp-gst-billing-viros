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
}

export async function GET(req: NextRequest) {
  try {
    // Windows printer discovery via PowerShell Get-CimInstance
    if (process.platform === 'win32') {
      try {
        const { stdout } = await execAsync(
          'powershell -NoProfile -Command "Get-CimInstance Win32_Printer | Select-Object Name, Default, PortName, DriverName | ConvertTo-Json"'
        )
        const parsed = JSON.parse(stdout.trim())
        const list = Array.isArray(parsed) ? parsed : [parsed]

        const printers: DevicePrinter[] = list
          .filter((p) => p && p.Name)
          .map((p) => {
            const name = String(p.Name || '')
            const driver = String(p.DriverName || '')
            const isThermal = /zebra|tsc|zdesigner|tvs|godex|citizen|honeywell|xprinter|rongta|pos|barcode|thermal|label/i.test(
              `${name} ${driver}`
            )
            return {
              name,
              isDefault: Boolean(p.Default),
              portName: String(p.PortName || ''),
              driverName: driver,
              isThermal,
            }
          })

        // Sort default and thermal printers to the top
        printers.sort((a, b) => {
          if (a.isDefault) return -1
          if (b.isDefault) return 1
          if (a.isThermal && !b.isThermal) return -1
          if (!a.isThermal && b.isThermal) return 1
          return a.name.localeCompare(b.name)
        })

        return NextResponse.json({ printers, platform: 'win32' })
      } catch (psErr) {
        console.error('PowerShell printer detection error:', psErr)
      }
    }

    // Fallback list
    return NextResponse.json({
      printers: [
        {
          name: 'System Default Printer',
          isDefault: true,
          portName: 'USB',
          driverName: 'Generic Thermal Printer',
          isThermal: true,
        },
      ],
      platform: process.platform,
    })
  } catch (err: any) {
    console.error('GET /api/printers error:', err)
    return NextResponse.json({ error: 'Failed to retrieve printers', printers: [] }, { status: 500 })
  }
}
