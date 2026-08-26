import db from '@/lib/db'

let schemaReady = false
let schemaPromise: Promise<void> | null = null

export async function ensureActivityLogSchema(): Promise<void> {
  if (schemaReady) return
  if (schemaPromise) return schemaPromise

  schemaPromise = (async () => {
    try {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS user_activity_logs (
          id VARCHAR(64) PRIMARY KEY,
          user_id VARCHAR(191) NOT NULL,
          user_name VARCHAR(191) NULL,
          user_email VARCHAR(191) NOT NULL,
          user_role VARCHAR(50) NULL,
          organization_id VARCHAR(191) NULL,
          organization_name VARCHAR(191) NULL,
          session_id VARCHAR(191) NOT NULL,
          ip_address VARCHAR(100) NULL,
          browser VARCHAR(100) NULL,
          os VARCHAR(100) NULL,
          device VARCHAR(100) NULL,
          user_agent TEXT NULL,
          login_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          last_active_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          duration_seconds INT NOT NULL DEFAULT 0,
          status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_user_id (user_id),
          INDEX idx_user_email (user_email),
          INDEX idx_org_id (organization_id),
          INDEX idx_session_id (session_id),
          INDEX idx_login_at (login_at),
          INDEX idx_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `)
      schemaReady = true
    } catch (error) {
      console.error('ensureActivityLogSchema failed:', error)
      throw error
    } finally {
      schemaPromise = null
    }
  })()

  return schemaPromise
}
