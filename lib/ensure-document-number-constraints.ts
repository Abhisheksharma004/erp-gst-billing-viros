import db from '@/lib/db'
import { ensureOrganizationSchema } from '@/lib/ensure-organization-schema'

let constraintsReady = false
let ensurePromise: Promise<void> | null = null

const DOCUMENT_NUMBER_TABLES = [
  { table: 'quotations', column: 'quotation_no' },
  { table: 'purchases', column: 'purchase_no' },
  { table: 'delivery_challans', column: 'challan_no' },
  { table: 'invoices', column: 'invoice_no' },
  { table: 'purchase_orders', column: 'po_no' },
  { table: 'returnable_challans', column: 'challan_no' },
] as const

async function columnExists(table: string, column: string): Promise<boolean> {
  const [rows] = (await db.execute(
    `SELECT COUNT(*) as cnt FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  )) as [{ cnt: number }[], unknown]
  return Number(rows[0]?.cnt) > 0
}

async function indexExists(table: string, indexName: string): Promise<boolean> {
  const [rows] = (await db.execute(
    `SELECT COUNT(*) as cnt FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [table, indexName]
  )) as [{ cnt: number }[], unknown]
  return Number(rows[0]?.cnt) > 0
}

async function runAlter(sql: string): Promise<void> {
  try {
    await db.execute(sql)
  } catch (e: unknown) {
    const err = e as { code?: string; errno?: number; message?: string }
    const msg = String(err?.message ?? '')
    const isDuplicate =
      err?.code === 'ER_DUP_FIELDNAME' ||
      err?.errno === 1060 ||
      /duplicate column name/i.test(msg)
    const isDuplicateKey =
      err?.errno === 1061 ||
      /duplicate key name/i.test(msg)
    const isExists =
      err?.code === 'ER_TABLE_EXISTS_ERROR' ||
      err?.errno === 1050 ||
      /already exists/i.test(msg)
    const isMissing =
      err?.code === 'ER_BAD_FIELD_ERROR' ||
      err?.errno === 1054 ||
      /unknown column/i.test(msg)
    if (!isDuplicate && !isDuplicateKey && !isExists && !isMissing) throw e
  }
}

async function dropUniqueIndexesOnColumn(table: string, column: string): Promise<void> {
  const [rows] = (await db.execute(
    `SELECT INDEX_NAME FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? AND NON_UNIQUE = 0`,
    [table, column]
  )) as [{ INDEX_NAME: string }[], unknown]

  for (const r of rows) {
    const idx = r.INDEX_NAME
    if (idx === 'PRIMARY') continue
    try {
      await db.execute(`ALTER TABLE ${table} DROP INDEX ${idx}`)
    } catch {
      // ignore individual drop failures
    }
  }
}

async function ensurePerOrgDocumentNumberUnique(
  table: string,
  numberColumn: string
): Promise<void> {
  const hasOrgCol = await columnExists(table, 'organization_id')
  const hasNoCol = await columnExists(table, numberColumn)
  if (!hasOrgCol || !hasNoCol) return

  const indexName = `uq_${table}_org_${numberColumn}`.slice(0, 64)
  if (await indexExists(table, indexName)) return

  await dropUniqueIndexesOnColumn(table, numberColumn)
  await runAlter(
    `ALTER TABLE ${table} ADD UNIQUE KEY ${indexName} (organization_id, ${numberColumn})`
  )
}

async function runEnsureDocumentNumberConstraints(): Promise<void> {
  await ensureOrganizationSchema()

  for (const { table, column } of DOCUMENT_NUMBER_TABLES) {
    try {
      await ensurePerOrgDocumentNumberUnique(table, column)
    } catch (e) {
      console.error(`ensureDocumentNumberConstraints: ${table}.${column}`, e)
    }
  }

  constraintsReady = true
}

/** Per-organization document numbers (fixes global UNIQUE collisions on multi-tenant live DBs). */
export async function ensureDocumentNumberConstraints(): Promise<void> {
  if (constraintsReady) return
  if (!ensurePromise) {
    ensurePromise = runEnsureDocumentNumberConstraints().finally(() => {
      ensurePromise = null
    })
  }
  return ensurePromise
}
