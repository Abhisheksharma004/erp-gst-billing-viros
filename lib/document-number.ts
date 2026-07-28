export type DocumentNumberStructure = 'PREFIX_SERIAL_FY' | 'PREFIX_FY_SERIAL' | 'FY_PREFIX_SERIAL'

/** Financial Year information (Indian FY: April 1 to March 31).
 * E.g., for July 28, 2026: fyStart = 2026, fyEnd = 2027, fyString = "2026/27"
 */
export function getFinancialYearInfo(date: Date | string, separator: string = '/'): {
  fyStart: number
  fyEnd: number
  fyEndShort: string
  fyString: string
} {
  const d = typeof date === 'string' ? new Date(date) : date
  const month = d.getMonth() // 0-indexed: 0=Jan, 3=Apr
  const year = d.getFullYear()
  const fyStart = month >= 3 ? year : year - 1
  const fyEnd = fyStart + 1
  const fyEndShort = String(fyEnd % 100).padStart(2, '0')
  const sep = separator ?? '/'
  return {
    fyStart,
    fyEnd,
    fyEndShort,
    fyString: `${fyStart}${sep}${fyEndShort}`,
  }
}

/** Formats document number according to separator & component structure.
 * E.g.:
 * - PREFIX_SERIAL_FY: MV/001/2026/27
 * - PREFIX_FY_SERIAL: MV/2026/27/001
 * - FY_PREFIX_SERIAL: 2026/27/MV/001
 */
export function buildDocumentNumber(
  modulePrefix: string,
  serial: number,
  documentDate: Date | string,
  separator: string = '/',
  structure: string = 'PREFIX_SERIAL_FY'
): string {
  const sep = separator ?? '/'
  const { fyStart, fyEndShort } = getFinancialYearInfo(documentDate, sep)
  const paddedSerial = String(Math.max(1, serial)).padStart(3, '0')
  const cleanPrefix = (modulePrefix || 'DOC').replace(
    new RegExp(`[${sep === '/' ? '\\/' : sep || ' ' }]+$`),
    ''
  )

  if (structure === 'FY_PREFIX_SERIAL') {
    return [fyStart, fyEndShort, cleanPrefix, paddedSerial].join(sep)
  }
  if (structure === 'PREFIX_FY_SERIAL') {
    return [cleanPrefix, fyStart, fyEndShort, paddedSerial].join(sep)
  }
  return [cleanPrefix, paddedSerial, fyStart, fyEndShort].join(sep)
}

/** SQL search pattern for documents in the same FY */
export function buildDocumentNumberLikePattern(
  modulePrefix: string,
  documentDate: Date | string,
  separator: string = '/',
  structure: string = 'PREFIX_SERIAL_FY'
): string {
  const sep = separator ?? '/'
  const { fyStart, fyEndShort } = getFinancialYearInfo(documentDate, sep)
  const cleanPrefix = (modulePrefix || 'DOC').replace(
    new RegExp(`[${sep === '/' ? '\\/' : sep || ' ' }]+$`),
    ''
  )

  if (structure === 'FY_PREFIX_SERIAL') {
    return [fyStart, fyEndShort, cleanPrefix, '%'].join(sep)
  }
  if (structure === 'PREFIX_FY_SERIAL') {
    return [cleanPrefix, fyStart, fyEndShort, '%'].join(sep)
  }
  return [cleanPrefix, '%', fyStart, fyEndShort].join(sep)
}

/** Legacy support fallback */
export function buildDocumentNumberPrefix(
  modulePrefix: string,
  date: Date | string,
  separator: string = '/',
  structure: string = 'PREFIX_SERIAL_FY'
): string {
  return buildDocumentNumberLikePattern(modulePrefix, date, separator, structure)
}

/** Parses serial number from document number format */
export function parseDocumentSerial(documentNo?: string | null, separator: string = '/'): number | null {
  if (!documentNo) return null
  const sep = separator || '/'
  const parts = documentNo.split(sep)
  for (const part of parts) {
    if (/^\d+$/.test(part) && part.length !== 4 && part.length !== 2) {
      return parseInt(part, 10)
    }
  }
  return null
}

/** Backward compatibility helper */
export function documentSerialSubstringStart(numberPrefix: string): number {
  return numberPrefix.length + 1
}

/** Generates next document number from last document number */
export function nextDocumentNumber(
  modulePrefix: string,
  documentDate: Date | string,
  lastDocumentNo: string | null | undefined,
  separator: string = '/',
  structure: string = 'PREFIX_SERIAL_FY'
): string {
  let nextSerial = 1
  if (lastDocumentNo) {
    const serial = parseDocumentSerial(lastDocumentNo, separator)
    if (serial !== null) nextSerial = serial + 1
  }
  return buildDocumentNumber(modulePrefix, nextSerial, documentDate, separator, structure)
}

/** Executes MySQL MAX serial query according to organization, separator, and structure */
export async function fetchMaxDocumentSerial(
  conn: any,
  tableName: string,
  columnName: string,
  organizationId: string,
  likePattern: string,
  separator: string = '/',
  structure: string = 'PREFIX_SERIAL_FY'
): Promise<number> {
  const sep = separator ?? '/'
  if (sep !== '') {
    if (structure === 'FY_PREFIX_SERIAL' || structure === 'PREFIX_FY_SERIAL') {
      const [maxRow] = (await conn.execute(
        `SELECT MAX(CAST(SUBSTRING_INDEX(${columnName}, ?, -1) AS UNSIGNED)) AS maxSerial
         FROM ${tableName}
         WHERE organization_id = ? AND ${columnName} LIKE ?`,
        [sep, organizationId, likePattern]
      )) as any[]
      return Number(maxRow[0]?.maxSerial) || 0
    } else {
      const [maxRow] = (await conn.execute(
        `SELECT MAX(CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(${columnName}, ?, 2), ?, -1) AS UNSIGNED)) AS maxSerial
         FROM ${tableName}
         WHERE organization_id = ? AND ${columnName} LIKE ?`,
        [sep, sep, organizationId, likePattern]
      )) as any[]
      return Number(maxRow[0]?.maxSerial) || 0
    }
  } else {
    const [maxRow] = (await conn.execute(
      `SELECT MAX(CAST(${columnName} AS UNSIGNED)) AS maxSerial
       FROM ${tableName}
       WHERE organization_id = ? AND ${columnName} LIKE ?`,
      [organizationId, likePattern]
    )) as any[]
    return Number(maxRow[0]?.maxSerial) || 0
  }
}
