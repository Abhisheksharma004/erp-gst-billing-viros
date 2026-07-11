import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import bcrypt from 'bcryptjs'
import {
  isStrongEnoughPassword,
  PASSWORD_REQUIREMENTS_MESSAGE,
  verifyOtpHash,
} from '@/lib/auth-otp'
import { ensureOtpSchema } from '@/lib/ensure-otp-schema'
import { clientIpFromRequest, rateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    await ensureOtpSchema()

    const body = await request.json()
    const email = body?.email?.toString().trim().toLowerCase()
    const otp = body?.otp?.toString().trim()
    const newPassword = body?.newPassword?.toString() ?? ''
    const ip = clientIpFromRequest(request)

    const ipLimit = rateLimit(`reset-ip:${ip}`, 10, 15 * 60 * 1000)
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Try again later.' },
        { status: 429, headers: { 'Retry-After': String(ipLimit.retryAfterSec) } }
      )
    }

    if (!email || !otp || !newPassword) {
      return NextResponse.json(
        { error: 'Email, OTP, and new password are required' },
        { status: 400 }
      )
    }

    if (!isStrongEnoughPassword(newPassword)) {
      return NextResponse.json(
        { error: PASSWORD_REQUIREMENTS_MESSAGE },
        { status: 400 }
      )
    }

    let users: { otp: string | null; otp_expiry: Date | string | null }[] = []
    try {
      const [rows] = (await db.execute(
        'SELECT otp, otp_expiry FROM users WHERE email = ? LIMIT 1',
        [email]
      )) as [typeof users, unknown]
      users = rows
    } catch (dbError: unknown) {
      const err = dbError as { code?: string }
      if (err?.code === 'ER_BAD_FIELD_ERROR') {
        return NextResponse.json(
          { error: 'Database is missing otp columns. Run the OTP migration first.' },
          { status: 500 }
        )
      }
      throw dbError
    }

    if (!users[0]) {
      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 })
    }

    const user = users[0]
    const expired = !user.otp_expiry || new Date(user.otp_expiry) < new Date()
    const match = !expired && (await verifyOtpHash(otp, user.otp))

    if (!match) {
      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12)

    await db.execute(
      'UPDATE users SET password = ?, otp = NULL, otp_expiry = NULL WHERE email = ?',
      [hashedPassword, email]
    )

    return NextResponse.json({ message: 'Password reset successfully' })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
