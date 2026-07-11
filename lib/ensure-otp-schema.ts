import db from '@/lib/db'

let schemaReady = false

/**
 * OTP is stored as a bcrypt hash (~60 chars). Older schemas used VARCHAR(10)
 * for plain OTPs — widen the column so forgot-password does not fail.
 */
export async function ensureOtpSchema(): Promise<void> {
  if (schemaReady) return

  try {
    await db.execute('ALTER TABLE users ADD COLUMN otp VARCHAR(72) NULL')
  } catch (e: unknown) {
    const err = e as { code?: string; errno?: number; message?: string }
    const msg = String(err?.message ?? '')
    if (
      err?.code !== 'ER_DUP_FIELDNAME' &&
      err?.errno !== 1060 &&
      !/duplicate column name/i.test(msg)
    ) {
      throw e
    }
  }

  try {
    await db.execute('ALTER TABLE users ADD COLUMN otp_expiry DATETIME NULL')
  } catch (e: unknown) {
    const err = e as { code?: string; errno?: number; message?: string }
    const msg = String(err?.message ?? '')
    if (
      err?.code !== 'ER_DUP_FIELDNAME' &&
      err?.errno !== 1060 &&
      !/duplicate column name/i.test(msg)
    ) {
      throw e
    }
  }

  await db.execute('ALTER TABLE users MODIFY COLUMN otp VARCHAR(72) NULL')

  schemaReady = true
}
