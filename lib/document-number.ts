import { getYearMonthPrefix } from '@/lib/org-id'
import type mysql from 'mysql2/promise'

/** Module prefix + YYYYMM, e.g. PO202406 */
export function buildDocumentNumberPrefix(
  modulePrefix: string,
  date: Date | string
): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return `${modulePrefix}${getYearMonthPrefix(d)}`
}

function parseDocumentSerial(
  documentNo: string,
  numberPrefix: string
): number | null {
  if (!documentNo.startsWith(numberPrefix)) return null
  const serialPart = documentNo.slice(numberPrefix.length)
  if (!/^\d+$/.test(serialPart)) return null
  return parseInt(serialPart, 10)
}

/** 1-based MySQL SUBSTRING start for the serial portion after numberPrefix */
export function documentSerialSubstringStart(numberPrefix: string): number {
  return numberPrefix.length + 1
}

/** Prefix + YYYYMM + serial, e.g. PO2024061 */
export function nextDocumentNumber(
  modulePrefix: string,
  documentDate: Date | string,
  lastDocumentNo: string | null | undefined
): string {
  const numberPrefix = buildDocumentNumberPrefix(modulePrefix, documentDate)
  let nextSerial = 1
  if (lastDocumentNo) {
    const serial = parseDocumentSerial(lastDocumentNo, numberPrefix)
    if (serial !== null) nextSerial = serial + 1
  }
  return `${numberPrefix}${nextSerial}`
}

const PREFIX_COLUMN_ALIASES: Record<string, string[]> = {
  quotation_prefix: ['quotation_prefix', 'quot_prefix'],
  purchase_order_prefix: ['purchase_order_prefix', 'po_prefix'],
  challan_prefix: ['challan_prefix'],
  invoice_prefix: ['invoice_prefix'],
}

/** Read document prefix from business_settings (supports legacy column names on older live DBs). */
export async function loadDocumentPrefix(
  conn: mysql.Pool | mysql.PoolConnection,
  organizationId: string,
  column: keyof typeof PREFIX_COLUMN_ALIASES,
  fallback: string
): Promise<string> {
  const aliases = PREFIX_COLUMN_ALIASES[column]
  const hasOrgCol = await (async () => {
    const [rows] = (await conn.execute(
      `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'business_settings' AND COLUMN_NAME = 'organization_id'`
    )) as [{ cnt: number }[], unknown]
    return Number(rows[0]?.cnt) > 0
  })()

  for (const col of aliases) {
    const [colRows] = (await conn.execute(
      `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'business_settings' AND COLUMN_NAME = ?`,
      [col]
    )) as [{ cnt: number }[], unknown]
    if (Number(colRows[0]?.cnt) === 0) continue

    const sql = hasOrgCol
      ? `SELECT ${col} AS prefix FROM business_settings WHERE organization_id = ? LIMIT 1`
      : `SELECT ${col} AS prefix FROM business_settings LIMIT 1`
    const params = hasOrgCol ? [organizationId] : []
    const [rows] = (await conn.execute(sql, params)) as [{ prefix: string | null }[], unknown]
    const value = rows[0]?.prefix?.trim()
    if (value) return value
  }

  return fallback
}
