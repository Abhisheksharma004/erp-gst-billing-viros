/** Client-side Excel (.xls / Spreadsheet XML) export */

export interface ExcelMeta {
  reportTitle?: string
  fromDate?: string
  toDate?: string
  partyName?: string
  generatedDate?: string
  [key: string]: unknown
}

function escapeXml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function sheetXml(
  data: Record<string, unknown>[],
  sheetName: string,
  meta?: ExcelMeta
): string {
  let metaRows = ''

  if (meta) {
    const metaCells: string[] = []
    if (meta.reportTitle) metaCells.push(`Report: ${meta.reportTitle}`)
    if (meta.fromDate && meta.toDate) metaCells.push(`Period: ${meta.fromDate} to ${meta.toDate}`)
    if (meta.partyName) metaCells.push(`Party: ${meta.partyName}`)
    if (meta.generatedDate) metaCells.push(`Generated: ${meta.generatedDate}`)

    if (metaCells.length > 0) {
      metaRows = `<Row>${metaCells
        .map((cell) => `<Cell><Data ss:Type="String">${escapeXml(cell)}</Data></Cell>`)
        .join('')}</Row><Row></Row>`
    }
  }

  if (!data || data.length === 0) {
    return `<Worksheet ss:Name="${escapeXml(sheetName)}"><Table>${metaRows}<Row><Cell><Data ss:Type="String">No records found</Data></Cell></Row></Table></Worksheet>`
  }

  // Extract all unique headers from data rows
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

  return `<Worksheet ss:Name="${escapeXml(sheetName)}"><Table>${metaRows}${headerRow}${bodyRows}</Table></Worksheet>`
}

function downloadSpreadsheet(
  sheets: { name: string; data: Record<string, unknown>[] }[],
  filename: string,
  meta?: ExcelMeta
) {
  const worksheetXml = sheets.map((s) => sheetXml(s.data, s.name, meta)).join('')
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
  sheetName = 'Sheet1',
  meta?: ExcelMeta
) {
  downloadSpreadsheet([{ name: sheetName, data }], filename, meta)
}

export function exportMultiSheet(
  sheets: { name: string; data: Record<string, unknown>[] }[],
  filename: string,
  meta?: ExcelMeta
) {
  downloadSpreadsheet(sheets, filename, meta)
}
