import db from '@/lib/db'

let purchaseSchemaReady = false

async function hasColumn(table: string, column: string): Promise<boolean> {
  const [rows] = (await db.execute(
    `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  )) as [{ cnt: number }[], unknown]
  return Number(rows[0]?.cnt) > 0
}

function isDuplicateColumnError(e: unknown): boolean {
  const err = e as { code?: string; errno?: number; message?: string }
  const msg = String(err?.message ?? '')
  return (
    err?.code === 'ER_DUP_FIELDNAME' ||
    err?.errno === 1060 ||
    /duplicate column name/i.test(msg)
  )
}

async function addColumn(sql: string): Promise<void> {
  try {
    await db.execute(sql)
  } catch (e: unknown) {
    if (!isDuplicateColumnError(e)) throw e
  }
}

export async function ensurePurchaseSchema(): Promise<void> {
  if (purchaseSchemaReady) return

  if (!(await hasColumn('purchases', 'round_off'))) {
    await addColumn(
      'ALTER TABLE purchases ADD COLUMN round_off DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER tax_amount'
    )
  }
  try {
    await db.execute(
      'ALTER TABLE purchase_items MODIFY COLUMN discount DECIMAL(10,2) NOT NULL DEFAULT 0'
    )
  } catch {
    // column may already be correct
  }
  purchaseSchemaReady = true
}

let documentTermsColumnsReady = false

export async function ensureDocumentTermsColumns(): Promise<void> {
  if (documentTermsColumnsReady) return
  for (const table of ['purchase_orders', 'purchases'] as const) {
    if (!(await hasColumn(table, 'terms'))) {
      await addColumn(`ALTER TABLE ${table} ADD COLUMN terms TEXT NULL AFTER notes`)
    }
  }
  if (!(await hasColumn('purchase_orders', 'include_pricing'))) {
    await addColumn(
      'ALTER TABLE purchase_orders ADD COLUMN include_pricing TINYINT(1) NOT NULL DEFAULT 0 AFTER terms'
    )
  }
  documentTermsColumnsReady = true
}
