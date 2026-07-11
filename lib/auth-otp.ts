import { createHash, randomInt, timingSafeEqual } from 'crypto'
import bcrypt from 'bcryptjs'

export const OTP_EXPIRY_SECONDS = 60
export const OTP_EXPIRY_MS = OTP_EXPIRY_SECONDS * 1000
/** Time allowed to set a new password after OTP is verified */
export const PASSWORD_RESET_WINDOW_MS = 10 * 60 * 1000
export const OTP_LENGTH = 6
export const OTP_MAX_ATTEMPTS = 5

export {
  MIN_PASSWORD_LENGTH as MIN_RESET_PASSWORD_LENGTH,
  PASSWORD_REQUIREMENTS_MESSAGE,
  isStrongPassword as isStrongEnoughPassword,
} from '@/lib/password-policy'

/** Generic response — never reveal whether the email exists */
export const OTP_GENERIC_SENT_MESSAGE =
  'If an account exists for that email, an OTP has been sent.'

export function generateOtp(): string {
  const min = 10 ** (OTP_LENGTH - 1)
  const max = 10 ** OTP_LENGTH
  return String(randomInt(min, max))
}

export async function hashOtp(otp: string): Promise<string> {
  return bcrypt.hash(otp, 10)
}

export async function verifyOtpHash(otp: string, hash: string | null | undefined): Promise<boolean> {
  if (!hash || !otp) return false
  try {
    return await bcrypt.compare(otp, hash)
  } catch {
    return false
  }
}

/** Constant-time-ish compare for non-bcrypt tokens */
export function safeEqualString(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}
