import db from '@/lib/db'

let purchaseSchemaReady = false

export async function ensurePurchaseSchema(): Promise<void> {
  if (purchaseSchemaReady) return

  // Drop legacy purchase_no column if it still exists (migration: replaced by bill_no)
  try {
    await db.execute('ALTER TABLE purchases DROP COLUMN purchase_no')
  } catch (e: unknown) {
    const err = e as { code?: string; errno?: number; message?: string }
    const msg = String(err?.message ?? '')
    const alreadyGone =
      err?.code === 'ER_CANT_DROP_FIELD_OR_KEY' ||
      err?.errno === 1091 ||
      /can't drop.*check that.*exists/i.test(msg)
    if (!alreadyGone) console.warn('[ensurePurchaseSchema] DROP purchase_no:', msg)
  }

  try {
    await db.execute(
      'ALTER TABLE purchases ADD COLUMN round_off DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER tax_amount'
    )
  } catch (e: unknown) {
    const err = e as { code?: string; errno?: number; message?: string }
    const msg = String(err?.message ?? '')
    const isDuplicate =
      err?.code === 'ER_DUP_FIELDNAME' ||
      err?.errno === 1060 ||
      /duplicate column name/i.test(msg)
    if (!isDuplicate) throw e
  }
  try {
    await db.execute(
      'ALTER TABLE purchase_items MODIFY COLUMN discount DECIMAL(10,2) NOT NULL DEFAULT 0'
    )
  } catch {
    // column may already be correct
  }
  try {
    await db.execute(
      'ALTER TABLE purchase_items ADD COLUMN sort_order INT NOT NULL DEFAULT 0'
    )
  } catch {
    // column may already exist
  }
  try {
    await db.execute(
      'ALTER TABLE purchase_order_items ADD COLUMN sort_order INT NOT NULL DEFAULT 0'
    )
  } catch {
    // column may already exist
  }
  purchaseSchemaReady = true
}

let documentTermsColumnsReady = false

export async function ensureDocumentTermsColumns(): Promise<void> {
  if (documentTermsColumnsReady) return
  for (const table of ['purchase_orders', 'purchases'] as const) {
    try {
      await db.execute(`ALTER TABLE ${table} ADD COLUMN terms TEXT NULL AFTER notes`)
    } catch (e: unknown) {
      const err = e as { code?: string; errno?: number; message?: string }
      const msg = String(err?.message ?? '')
      const isDuplicate =
        err?.code === 'ER_DUP_FIELDNAME' ||
        err?.errno === 1060 ||
        /duplicate column name/i.test(msg)
      if (!isDuplicate) throw e
    }
  }
  try {
    await db.execute(
      'ALTER TABLE purchase_orders ADD COLUMN include_pricing TINYINT(1) NOT NULL DEFAULT 0 AFTER terms'
    )
  } catch (e: unknown) {
    const err = e as { code?: string; errno?: number; message?: string }
    const msg = String(err?.message ?? '')
    const isDuplicate =
      err?.code === 'ER_DUP_FIELDNAME' ||
      err?.errno === 1060 ||
      /duplicate column name/i.test(msg)
    if (!isDuplicate) throw e
  }
  documentTermsColumnsReady = true
}
