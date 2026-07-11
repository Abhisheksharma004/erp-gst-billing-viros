import db from '@/lib/db'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'

let schemaReady = false

async function runAlter(sql: string): Promise<void> {
  try {
    await db.execute(sql)
  } catch (e: unknown) {
    const err = e as { code?: string; errno?: number; message?: string }
    const msg = String(err?.message ?? '')
    if (
      err?.code === 'ER_DUP_FIELDNAME' ||
      err?.errno === 1060 ||
      /duplicate column name/i.test(msg)
    ) {
      return
    }
    throw e
  }
}

/**
 * Ensures `is_super_admin` column exists.
 * Optional one-time seed: only when SUPERADMIN_EMAIL + SUPERADMIN_PASSWORD are set
 * AND no superadmin user exists yet. Never overwrites an existing password.
 */
export async function ensureSuperAdminSchema(): Promise<void> {
  if (schemaReady) return

  await runAlter(
    'ALTER TABLE users ADD COLUMN is_super_admin TINYINT(1) NOT NULL DEFAULT 0 AFTER role'
  )

  const seedEmail = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase()
  const seedPassword = process.env.SUPERADMIN_PASSWORD

  if (seedEmail && seedPassword && seedPassword.length >= 8) {
    const [existingSa] = (await db.execute(
      'SELECT id FROM users WHERE is_super_admin = 1 LIMIT 1'
    )) as [{ id: string }[], unknown]

    if (!existingSa[0]) {
      const [byEmail] = (await db.execute('SELECT id FROM users WHERE email = ? LIMIT 1', [
        seedEmail,
      ])) as [{ id: string }[], unknown]

      if (byEmail[0]) {
        await db.execute('UPDATE users SET is_super_admin = 1, status = ? WHERE id = ?', [
          'ACTIVE',
          byEmail[0].id,
        ])
      } else {
        const hash = await bcrypt.hash(seedPassword, 12)
        await db.execute(
          `INSERT INTO users (id, name, email, password, role, is_super_admin, status)
           VALUES (?, ?, ?, ?, 'ADMIN', 1, 'ACTIVE')`,
          [randomUUID(), 'Super Admin', seedEmail, hash]
        )
      }
    }
  }

  schemaReady = true
}

export async function isUserSuperAdmin(userId: string): Promise<boolean> {
  await ensureSuperAdminSchema()
  const [rows] = (await db.execute(
    'SELECT is_super_admin, status FROM users WHERE id = ? LIMIT 1',
    [userId]
  )) as [{ is_super_admin: number; status: string }[], unknown]
  const row = rows[0]
  if (!row || row.status === 'INACTIVE') return false
  return Boolean(Number(row.is_super_admin))
}
