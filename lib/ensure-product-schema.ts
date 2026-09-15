import db from '@/lib/db'

let schemaReady = false

async function runAlter(sql: string): Promise<void> {
  try {
    await db.execute(sql)
  } catch (e: unknown) {
    const err = e as { code?: string; errno?: number; message?: string }
    const msg = String(err?.message ?? '')
    const isDuplicate =
      err?.code === 'ER_DUP_FIELDNAME' ||
      err?.errno === 1060 ||
      /duplicate column name/i.test(msg) ||
      /Duplicate column/i.test(msg)
    const isMissing =
      err?.code === 'ER_BAD_FIELD_ERROR' ||
      err?.errno === 1054 ||
      /unknown column/i.test(msg) ||
      /Table .* doesn't exist/i.test(msg)
    if (!isDuplicate && !isMissing) {
      console.warn('ensurePricingPrecision non-critical alter notice:', msg)
    }
  }
}

/**
 * Ensures discount column exists and product rate/pricing columns support up to 3 decimal digits.
 */
export async function ensureProductsSchema(): Promise<void> {
  if (schemaReady) return

  // 1. Discount column on products
  await runAlter(
    'ALTER TABLE products ADD COLUMN discount DECIMAL(5,2) NULL DEFAULT NULL'
  )

  // 2. Products pricing 3-decimal precision (DECIMAL(12,3))
  await runAlter(
    'ALTER TABLE products MODIFY COLUMN purchase_price DECIMAL(12,3) NOT NULL DEFAULT 0'
  )
  await runAlter(
    'ALTER TABLE products MODIFY COLUMN selling_price DECIMAL(12,3) NOT NULL DEFAULT 0'
  )
  await runAlter(
    'ALTER TABLE products MODIFY COLUMN mrp DECIMAL(12,3) NULL DEFAULT NULL'
  )

  // 3. Document items rate 3-decimal precision (DECIMAL(12,3))
  await runAlter(
    'ALTER TABLE invoice_items MODIFY COLUMN rate DECIMAL(12,3) NOT NULL'
  )
  await runAlter(
    'ALTER TABLE quotation_items MODIFY COLUMN rate DECIMAL(12,3) NOT NULL'
  )
  await runAlter(
    'ALTER TABLE proforma_items MODIFY COLUMN rate DECIMAL(12,3) NOT NULL'
  )
  await runAlter(
    'ALTER TABLE purchase_items MODIFY COLUMN rate DECIMAL(12,3) NOT NULL'
  )
  await runAlter(
    'ALTER TABLE purchase_order_items MODIFY COLUMN rate DECIMAL(12,3) NOT NULL'
  )
  await runAlter(
    'ALTER TABLE delivery_challan_items MODIFY COLUMN rate DECIMAL(12,3) NOT NULL'
  )
  await runAlter(
    'ALTER TABLE challan_items MODIFY COLUMN rate DECIMAL(12,3) NOT NULL'
  )
  await runAlter(
    'ALTER TABLE returnable_challan_items MODIFY COLUMN rate DECIMAL(12,3) NOT NULL DEFAULT 0'
  )

  schemaReady = true
}

export const ensureProductsDiscountColumn = ensureProductsSchema
export const ensurePricingPrecision = ensureProductsSchema
