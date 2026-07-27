import db from '@/lib/db'

let schemaReady = false

async function hasColumn(table: string, column: string): Promise<boolean> {
  const [rows] = (await db.execute(
    `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  )) as [{ cnt: number }[], unknown]
  return Number(rows[0]?.cnt) > 0
}

async function tableExists(table: string): Promise<boolean> {
  const [rows] = (await db.execute(
    `SELECT COUNT(*) AS cnt FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [table]
  )) as [{ cnt: number }[], unknown]
  return Number(rows[0]?.cnt) > 0
}

async function safeExecute(sql: string): Promise<void> {
  try {
    await db.execute(sql)
  } catch (e: unknown) {
    const err = e as { code?: string; errno?: number; message?: string }
    const msg = String(err?.message ?? '')
    // Ignore duplicate column errors or duplicate index errors
    if (
      err?.code === 'ER_DUP_FIELDNAME' ||
      err?.errno === 1060 ||
      err?.code === 'ER_DUP_KEYNAME' ||
      err?.errno === 1061 ||
      /duplicate/i.test(msg)
    ) {
      return
    }
    console.error(`Schema alteration warning [${sql}]:`, msg)
  }
}

export async function ensurePaymentSchema(): Promise<void> {
  if (schemaReady) return

  const exists = await tableExists('payments')
  if (!exists) {
    await safeExecute(`
      CREATE TABLE IF NOT EXISTS payments (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        organization_id VARCHAR(36) NULL,
        payment_no VARCHAR(50) NULL,
        type VARCHAR(20) NOT NULL DEFAULT 'INWARD' COMMENT 'INWARD = Customer Receipt, OUTWARD = Vendor Payment',
        customer_id VARCHAR(36) NULL,
        vendor_id VARCHAR(36) NULL,
        invoice_id VARCHAR(36) NULL,
        purchase_id VARCHAR(36) NULL,
        amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        payment_date DATETIME NOT NULL,
        payment_mode VARCHAR(30) NOT NULL DEFAULT 'CASH',
        reference_no VARCHAR(100) NULL,
        bank_name VARCHAR(100) NULL,
        cheque_date DATE NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
        notes TEXT NULL,
        reference_id VARCHAR(36) NULL,
        created_by_id VARCHAR(36) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_payments_org (organization_id),
        INDEX idx_payments_org_type (organization_id, type),
        INDEX idx_payments_org_customer (organization_id, customer_id),
        INDEX idx_payments_org_vendor (organization_id, vendor_id),
        INDEX idx_payments_org_invoice (organization_id, invoice_id),
        INDEX idx_payments_org_purchase (organization_id, purchase_id),
        INDEX idx_payments_org_date (organization_id, payment_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `)
  } else {
    // If payments table was created with old schema, make reference_id NULLABLE
    if (await hasColumn('payments', 'reference_id')) {
      await safeExecute('ALTER TABLE payments MODIFY COLUMN reference_id VARCHAR(36) NULL')
    }

    if (!(await hasColumn('payments', 'organization_id'))) {
      await safeExecute('ALTER TABLE payments ADD COLUMN organization_id VARCHAR(36) NULL AFTER id')
    }
    if (!(await hasColumn('payments', 'payment_no'))) {
      await safeExecute('ALTER TABLE payments ADD COLUMN payment_no VARCHAR(50) NULL AFTER organization_id')
    }
    if (!(await hasColumn('payments', 'type'))) {
      await safeExecute("ALTER TABLE payments ADD COLUMN type VARCHAR(20) NOT NULL DEFAULT 'INWARD' AFTER payment_no")
    }
    if (!(await hasColumn('payments', 'customer_id'))) {
      await safeExecute('ALTER TABLE payments ADD COLUMN customer_id VARCHAR(36) NULL AFTER type')
    }
    if (!(await hasColumn('payments', 'vendor_id'))) {
      await safeExecute('ALTER TABLE payments ADD COLUMN vendor_id VARCHAR(36) NULL AFTER customer_id')
    }
    if (!(await hasColumn('payments', 'invoice_id'))) {
      await safeExecute('ALTER TABLE payments ADD COLUMN invoice_id VARCHAR(36) NULL AFTER vendor_id')
    }
    if (!(await hasColumn('payments', 'purchase_id'))) {
      await safeExecute('ALTER TABLE payments ADD COLUMN purchase_id VARCHAR(36) NULL AFTER invoice_id')
    }
    if (!(await hasColumn('payments', 'bank_name'))) {
      await safeExecute('ALTER TABLE payments ADD COLUMN bank_name VARCHAR(100) NULL AFTER reference_no')
    }
    if (!(await hasColumn('payments', 'cheque_date'))) {
      await safeExecute('ALTER TABLE payments ADD COLUMN cheque_date DATE NULL AFTER bank_name')
    }
    if (!(await hasColumn('payments', 'status'))) {
      await safeExecute("ALTER TABLE payments ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED' AFTER cheque_date")
    }
    if (!(await hasColumn('payments', 'created_by_id'))) {
      await safeExecute('ALTER TABLE payments ADD COLUMN created_by_id VARCHAR(36) NULL AFTER notes')
    }
    if (!(await hasColumn('payments', 'updated_at'))) {
      await safeExecute('ALTER TABLE payments ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at')
    }

    // Add indexes if missing
    await safeExecute('CREATE INDEX idx_payments_org ON payments (organization_id)')
    await safeExecute('CREATE INDEX idx_payments_org_type ON payments (organization_id, type)')
    await safeExecute('CREATE INDEX idx_payments_org_customer ON payments (organization_id, customer_id)')
    await safeExecute('CREATE INDEX idx_payments_org_vendor ON payments (organization_id, vendor_id)')
    await safeExecute('CREATE INDEX idx_payments_org_invoice ON payments (organization_id, invoice_id)')
    await safeExecute('CREATE INDEX idx_payments_org_purchase ON payments (organization_id, purchase_id)')
    await safeExecute('CREATE INDEX idx_payments_org_date ON payments (organization_id, payment_date)')

    // Data cleanup: Ensure payments linked to invoices are INWARD and payments linked to purchases are OUTWARD
    await safeExecute("UPDATE payments SET type = 'INWARD' WHERE type = 'INVOICE'")
    await safeExecute("UPDATE payments p JOIN invoices i ON p.reference_id = i.id SET p.customer_id = i.customer_id, p.invoice_id = i.id, p.type = 'INWARD' WHERE p.invoice_id IS NULL AND p.reference_id IS NOT NULL")
    await safeExecute("UPDATE payments p JOIN purchases pur ON p.reference_id = pur.id SET p.vendor_id = pur.vendor_id, p.purchase_id = pur.id, p.type = 'OUTWARD' WHERE p.purchase_id IS NULL AND p.reference_id IS NOT NULL")
  }

  schemaReady = true
}
