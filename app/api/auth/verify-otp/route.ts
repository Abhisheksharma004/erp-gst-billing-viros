import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import {
  OTP_MAX_ATTEMPTS,
  PASSWORD_RESET_WINDOW_MS,
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
    const ip = clientIpFromRequest(request)

    const ipLimit = rateLimit(`verify-otp-ip:${ip}`, 20, 15 * 60 * 1000)
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Try again later.' },
        { status: 429, headers: { 'Retry-After': String(ipLimit.retryAfterSec) } }
      )
    }

    if (!email || !otp) {
      return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 })
    }

    const emailLimit = rateLimit(`verify-otp-email:${email}`, OTP_MAX_ATTEMPTS, 15 * 60 * 1000)
    if (!emailLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many invalid attempts. Request a new OTP.' },
        { status: 429 }
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

    const passwordResetExpiry = new Date(Date.now() + PASSWORD_RESET_WINDOW_MS)
    await db.execute('UPDATE users SET otp_expiry = ? WHERE email = ?', [
      passwordResetExpiry,
      email,
    ])

    return NextResponse.json({ message: 'OTP verified successfully' })
  } catch (error) {
    console.error('Verify OTP error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
