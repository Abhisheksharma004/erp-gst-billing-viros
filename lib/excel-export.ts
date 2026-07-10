function escapeCsvValue(value: unknown) {
  if (value === null || value === undefined) return ''

  const stringValue = String(value)
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }

  return stringValue
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function toCsv(rows: Record<string, unknown>[], sheetName?: string) {
  if (!rows.length) {
    return sheetName ? `${sheetName}\n` : ''
  }

  const headers = Object.keys(rows[0])
  const lines = [headers.join(',')]

  for (const row of rows) {
    lines.push(headers.map((header) => escapeCsvValue(row[header])).join(','))
  }

  return sheetName ? `${sheetName}\n${lines.join('\n')}` : lines.join('\n')
}

export function exportToExcel(data: Record<string, unknown>[], filename: string, sheetName = 'Sheet1') {
  downloadCsv(toCsv(data, sheetName), filename)
}

export function exportMultiSheet(sheets: { name: string; data: Record<string, unknown>[] }[], filename: string) {
  const content = sheets.map((sheet) => toCsv(sheet.data, sheet.name)).join('\n\n')
  downloadCsv(content, filename)
}
