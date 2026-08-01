import db from '@/lib/db'
import { randomUUID } from 'crypto'
import {
  generateOrganizationId,
  migrateLegacyOrganizationIds,
} from '@/lib/org-id'
import { ensureOrganizationDetailsSchema } from '@/lib/ensure-organization-details-schema'
import { ensureOrganizationIdSequencesSchema } from '@/lib/ensure-organization-id-sequences'
import { ensureBusinessSettingsUniquePerOrg, ensureBusinessSettingsBankingColumns } from '@/lib/ensure-business-settings-schema'
import { ensurePaymentSchema } from '@/lib/ensure-payment-schema'
import { generateUniqueOrgSlug } from '@/lib/tenant'

let schemaReady = false
let schemaPromise: Promise<void> | null = null

async function getAnyOrganizationId(): Promise<string | null> {
  const [rows] = (await db.execute(
    'SELECT id FROM organizations ORDER BY created_at ASC LIMIT 1'
  )) as [{ id: string }[], unknown]
  return rows[0]?.id ?? null
}

/** One-time bootstrap when upgrading a legacy single-tenant DB with no organizations yet. */
async function bootstrapLegacyOrganizationIfNeeded(): Promise<string | null> {
  const [countRows] = (await db.execute(
    'SELECT COUNT(*) as cnt FROM organizations'
  )) as [{ cnt: number }[], unknown]
  if (Number(countRows[0]?.cnt) > 0) return getAnyOrganizationId()

  let companyName = 'My Organization'
  try {
    const [settingsRows] = (await db.execute(
      'SELECT company_name FROM business_settings WHERE company_name IS NOT NULL AND company_name != "" LIMIT 1'
    )) as [{ company_name: string }[], unknown]
    companyName = settingsRows[0]?.company_name?.trim() || companyName
  } catch {
    // business_settings may not exist yet on a fresh DB
  }

  const orgId = await generateOrganizationId(db)
  const slug = await generateUniqueOrgSlug(db, companyName)

  await db.execute(
    `INSERT INTO organizations (id, name, slug, status, plan) VALUES (?, ?, ?, 'ACTIVE', 'free')`,
    [orgId, companyName, slug]
  )

  return orgId
}

async function runAlter(sql: string, retries = 3): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await db.execute(sql)
      return
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
      const isDeadlock =
        err?.code === 'ER_LOCK_DEADLOCK' ||
        err?.errno === 1213 ||
        /deadlock/i.test(msg)

      if (isDuplicate || isDuplicateKey || isExists) return

      if (isDeadlock && attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 150))
        continue
      }
      throw e
    }
  }
}

async function indexExists(table: string, indexName: string): Promise<boolean> {
  const [rows] = (await db.execute(
    `SELECT COUNT(*) as cnt FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [table, indexName]
  )) as [{ cnt: number }[], unknown]
  return Number(rows[0]?.cnt) > 0
}

async function dropIndexIfExists(table: string, indexName: string): Promise<void> {
  if (!(await indexExists(table, indexName))) return
  await db.execute(`ALTER TABLE ${table} DROP INDEX ${indexName}`)
}

async function dropUniqueIndexesOnColumn(table: string, column: string): Promise<void> {
  const [rows] = (await db.execute(
    `SELECT INDEX_NAME FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? AND NON_UNIQUE = 0`,
    [table, column]
  )) as [{ INDEX_NAME: string }[], unknown]

  for (const r of rows) {
    const idx = r.INDEX_NAME
    try {
      await db.execute(`ALTER TABLE ${table} DROP INDEX ${idx}`)
    } catch {
      // ignore failures dropping individual indexes
    }
  }
}

async function columnExists(table: string, column: string): Promise<boolean> {
  const [rows] = (await db.execute(
    `SELECT COUNT(*) as cnt FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  )) as [{ cnt: number }[], unknown]
  return Number(rows[0]?.cnt) > 0
}

async function addOrgColumn(table: string, fallbackOrgId: string): Promise<void> {
  const hasCol = await columnExists(table, 'organization_id')
  if (!hasCol) {
    await runAlter(
      `ALTER TABLE ${table} ADD COLUMN organization_id VARCHAR(36) NULL AFTER id`
    )
    await db.execute(`UPDATE ${table} SET organization_id = ? WHERE organization_id IS NULL`, [
      fallbackOrgId,
    ])
    await runAlter(
      `ALTER TABLE ${table} MODIFY COLUMN organization_id VARCHAR(36) NOT NULL`
    )
  }

  const hasIndex = await indexExists(table, `idx_${table}_organization_id`)
  if (!hasIndex) {
    await runAlter(
      `ALTER TABLE ${table} ADD INDEX idx_${table}_organization_id (organization_id)`
    )
  }

  if (table === 'categories') {
    const hasCatOrgUnique = await indexExists('categories', 'uq_categories_org_name')
    if (!hasCatOrgUnique) {
      await dropUniqueIndexesOnColumn(table, 'name')
      await runAlter(
        `ALTER TABLE categories ADD UNIQUE KEY uq_categories_org_name (organization_id, name)`
      )
    }
  }
}

const TENANT_TABLES = [
  'business_settings',
  'categories',
  'brands',
  'products',
  'customers',
  'vendors',
  'quotations',
  'invoices',
  'purchase_orders',
  'purchases',
  'delivery_challans',
  'returnable_challans',
  'payments',
  'ledger_entries',
  'roles',
] as const

async function doEnsureOrganizationSchema(): Promise<void> {
  await ensureBusinessSettingsBankingColumns()
  await ensurePaymentSchema()

  await runAlter(`
    CREATE TABLE IF NOT EXISTS organizations (
      id VARCHAR(36) NOT NULL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(100) NOT NULL UNIQUE,
      status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
      plan VARCHAR(50) NOT NULL DEFAULT 'free',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  await runAlter(`
    CREATE TABLE IF NOT EXISTS organization_members (
      id VARCHAR(36) NOT NULL PRIMARY KEY,
      organization_id VARCHAR(36) NOT NULL,
      user_id VARCHAR(36) NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'STAFF',
      status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
      is_default TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_org_user (organization_id, user_id),
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  const fallbackOrgId = await bootstrapLegacyOrganizationIfNeeded()

  for (const table of TENANT_TABLES) {
    if (!fallbackOrgId) continue
    await addOrgColumn(table, fallbackOrgId)
  }

  const hasStaffModOrg = await columnExists('staff_module_permissions', 'organization_id')
  if (!hasStaffModOrg && fallbackOrgId) {
    await runAlter(
      `ALTER TABLE staff_module_permissions ADD COLUMN organization_id VARCHAR(36) NULL AFTER user_id`
    )
    await db.execute(
      `UPDATE staff_module_permissions SET organization_id = ? WHERE organization_id IS NULL`,
      [fallbackOrgId]
    )
    await runAlter(
      `ALTER TABLE staff_module_permissions MODIFY COLUMN organization_id VARCHAR(36) NOT NULL`
    )
    await runAlter(
      `ALTER TABLE staff_module_permissions DROP INDEX uq_user_module`
    ).catch(() => {})
    await runAlter(
      `ALTER TABLE staff_module_permissions ADD UNIQUE KEY uq_org_user_module (organization_id, user_id, module)`
    ).catch(() => {})
  }

  const [memberCount] = (await db.execute(
    'SELECT COUNT(*) as cnt FROM organization_members'
  )) as [{ cnt: number }[], unknown]

  if (Number(memberCount[0]?.cnt) === 0) {
    const targetOrgId = (await getAnyOrganizationId()) ?? fallbackOrgId
    if (!targetOrgId) {
      return
    }

    const [users] = (await db.execute('SELECT id, role FROM users')) as [
      { id: string; role: string }[],
      unknown,
    ]
    for (const user of users) {
      const memberRole = user.role === 'ADMIN' ? 'OWNER' : 'STAFF'
      await db.execute(
        `INSERT IGNORE INTO organization_members (id, organization_id, user_id, role, status, is_default)
         VALUES (?, ?, ?, ?, 'ACTIVE', 1)`,
        [randomUUID(), targetOrgId, user.id, memberRole]
      )
    }
  }

  await migrateLegacyOrganizationIds(db)
  await ensureOrganizationIdSequencesSchema()
  await ensureBusinessSettingsUniquePerOrg()
  await ensureOrganizationDetailsSchema()
}

export async function ensureOrganizationSchema(): Promise<void> {
  if (schemaReady) return
  if (schemaPromise) return schemaPromise

  schemaPromise = (async () => {
    try {
      await doEnsureOrganizationSchema()
      schemaReady = true
    } catch (err) {
      schemaPromise = null
      throw err
    }
  })()

  return schemaPromise
}
