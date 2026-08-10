import db from '@/lib/db'

let proformaSchemaReady = false
let ensurePromise: Promise<void> | null = null

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
      /duplicate key/i.test(msg)
    if (!isDuplicate) {
      console.warn('ensureProformaSchema runAlter notice:', msg)
    }
  }
}

async function runEnsureProformaSchema(): Promise<void> {
  await runAlter(`
    CREATE TABLE IF NOT EXISTS proformas (
      id VARCHAR(36) NOT NULL PRIMARY KEY,
      organization_id VARCHAR(36) NULL,
      proforma_no VARCHAR(50) NOT NULL,
      customer_id VARCHAR(36) NOT NULL,
      date DATETIME NOT NULL,
      valid_until DATETIME NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
      gst_type VARCHAR(20) NOT NULL DEFAULT 'CGST_SGST',
      subtotal DECIMAL(10,2) NOT NULL,
      discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
      tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
      round_off DECIMAL(10,2) NOT NULL DEFAULT 0,
      total_amount DECIMAL(10,2) NOT NULL,
      notes TEXT NULL,
      terms TEXT NULL,
      party_details JSON NULL,
      converted_to_id VARCHAR(36) NULL,
      created_by_id VARCHAR(36) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      UNIQUE KEY uq_proformas_org_proforma_no (organization_id, proforma_no)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  await runAlter(`
    CREATE TABLE IF NOT EXISTS proforma_items (
      id VARCHAR(36) NOT NULL PRIMARY KEY,
      proforma_id VARCHAR(36) NOT NULL,
      product_id VARCHAR(36) NOT NULL,
      description VARCHAR(255) NULL,
      quantity DECIMAL(10,3) NOT NULL,
      rate DECIMAL(10,2) NOT NULL,
      discount DECIMAL(5,2) NOT NULL DEFAULT 0,
      gst_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
      gst_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
      amount DECIMAL(10,2) NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      FOREIGN KEY (proforma_id) REFERENCES proformas(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  await runAlter("ALTER TABLE quotations MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'DRAFT'")
  await runAlter("ALTER TABLE proformas MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'DRAFT'")

  proformaSchemaReady = true
}

export async function ensureProformaSchema(): Promise<void> {
  if (proformaSchemaReady) return
  if (!ensurePromise) {
    ensurePromise = runEnsureProformaSchema().finally(() => {
      ensurePromise = null
    })
  }
  return ensurePromise
}
