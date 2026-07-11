/** Client-side Excel (.xlsx) export without the vulnerable `xlsx` package. */

function escapeXml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function sheetXml(data: Record<string, unknown>[], sheetName: string): string {
  if (!data.length) {
    return `<Worksheet ss:Name="${escapeXml(sheetName)}"><Table></Table></Worksheet>`
  }

  const headers = Object.keys(data[0])
  const headerRow = `<Row>${headers
    .map((h) => `<Cell><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`)
    .join('')}</Row>`
  const bodyRows = data
    .map((row) => {
      const cells = headers
        .map((key) => {
          const value = row[key]
          const isNumber = typeof value === 'number' && Number.isFinite(value)
          return `<Cell><Data ss:Type="${isNumber ? 'Number' : 'String'}">${escapeXml(value)}</Data></Cell>`
        })
        .join('')
      return `<Row>${cells}</Row>`
    })
    .join('')

  return `<Worksheet ss:Name="${escapeXml(sheetName)}"><Table>${headerRow}${bodyRows}</Table></Worksheet>`
}

function downloadSpreadsheet(
  sheets: { name: string; data: Record<string, unknown>[] }[],
  filename: string
) {
  const worksheetXml = sheets.map((s) => sheetXml(s.data, s.name)).join('')
  const xml = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
${worksheetXml}
</Workbook>`

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.xls') || filename.endsWith('.xlsx')
    ? filename.replace(/\.xlsx$/i, '.xls')
    : `${filename}.xls`
  link.click()
  URL.revokeObjectURL(url)
}

export function exportToExcel(
  data: Record<string, unknown>[],
  filename: string,
  sheetName = 'Sheet1'
) {
  downloadSpreadsheet([{ name: sheetName, data }], filename)
}

export function exportMultiSheet(
  sheets: { name: string; data: Record<string, unknown>[] }[],
  filename: string
) {
  downloadSpreadsheet(sheets, filename)
}
