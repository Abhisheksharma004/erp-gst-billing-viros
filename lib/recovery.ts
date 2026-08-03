import db from '@/lib/db'
import { randomUUID } from 'crypto'

export async function ensureRecoverySchema(): Promise<void> {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS deleted_records (
        id VARCHAR(36) PRIMARY KEY,
        organization_id VARCHAR(36) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        record_id VARCHAR(36) NOT NULL,
        reference_no VARCHAR(150) NULL,
        record_data JSON NOT NULL,
        deleted_by_user_id VARCHAR(36) NULL,
        deleted_by_user_name VARCHAR(255) NULL,
        deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_org (organization_id),
        INDEX idx_entity (entity_type),
        INDEX idx_deleted_at (deleted_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `)
  } catch (err) {
    console.error('Error ensuring recovery schema:', err)
  }
}

export interface ArchiveDeletedRecordParams {
  organizationId: string
  entityType: 'INVOICE' | 'PURCHASE' | 'PRODUCT' | 'CUSTOMER' | 'VENDOR' | 'QUOTATION' | 'PAYMENT'
  recordId: string
  referenceNo?: string
  recordData: Record<string, unknown>
  deletedByUserId?: string
  deletedByUserName?: string
}

export async function archiveDeletedRecord(params: ArchiveDeletedRecordParams): Promise<void> {
  await ensureRecoverySchema()
  const id = randomUUID()
  const payloadJson = JSON.stringify(params.recordData)
  await db.execute(
    `INSERT INTO deleted_records (id, organization_id, entity_type, record_id, reference_no, record_data, deleted_by_user_id, deleted_by_user_name, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      id,
      params.organizationId,
      params.entityType,
      params.recordId,
      params.referenceNo || null,
      payloadJson,
      params.deletedByUserId || null,
      params.deletedByUserName || null,
    ]
  )
}
