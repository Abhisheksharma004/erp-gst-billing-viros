import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import nodemailer from 'nodemailer'
import {
  OTP_EXPIRY_MS,
  OTP_EXPIRY_SECONDS,
  OTP_GENERIC_SENT_MESSAGE,
  generateOtp,
  hashOtp,
} from '@/lib/auth-otp'
import { ensureOtpSchema } from '@/lib/ensure-otp-schema'
import { clientIpFromRequest, rateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    await ensureOtpSchema()

    const body = await request.json()
    const email = body?.email?.toString().trim().toLowerCase()
    const ip = clientIpFromRequest(request)

    const ipLimit = rateLimit(`forgot-ip:${ip}`, 10, 15 * 60 * 1000)
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Try again later.' },
        { status: 429, headers: { 'Retry-After': String(ipLimit.retryAfterSec) } }
      )
    }

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 })
    }

    const emailLimit = rateLimit(`forgot-email:${email}`, 3, 15 * 60 * 1000)
    if (!emailLimit.allowed) {
      // Same generic message — do not reveal rate-limit vs missing user
      return NextResponse.json({ message: OTP_GENERIC_SENT_MESSAGE })
    }

    const [users] = (await db.execute('SELECT id FROM users WHERE email = ? LIMIT 1', [
      email,
    ])) as [{ id: string }[], unknown]

    // Always return generic success to prevent account enumeration
    if (!users[0]) {
      return NextResponse.json({ message: OTP_GENERIC_SENT_MESSAGE })
    }

    const otp = generateOtp()
    const otpHash = await hashOtp(otp)
    const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MS)

    try {
      await db.execute('UPDATE users SET otp = ?, otp_expiry = ? WHERE email = ?', [
        otpHash,
        otpExpiry,
        email,
      ])
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

    const smtpHost = process.env.SMTP_HOST?.trim()
    const smtpPort = Number(process.env.SMTP_PORT || 587)
    const smtpUser = process.env.SMTP_USER?.trim()
    const smtpPassword = process.env.SMTP_PASSWORD?.replace(/\s+/g, '').trim()

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPassword) {
      return NextResponse.json(
        {
          error:
            'SMTP is not configured. Please set SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASSWORD.',
        },
        { status: 500 }
      )
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPassword },
    })

    try {
      await transporter.verify()
      await transporter.sendMail({
        from: smtpUser,
        to: email,
        subject: 'Password Reset OTP',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Password Reset Request</h2>
            <p>Your OTP for password reset is:</p>
            <div style="font-size: 24px; font-weight: bold; color: #333; text-align: center; padding: 20px; border: 2px solid #ddd; border-radius: 5px;">
              ${otp}
            </div>
            <p>This OTP will expire in ${OTP_EXPIRY_SECONDS} seconds.</p>
            <p>If you didn't request this, please ignore this email.</p>
          </div>
        `,
      })
    } catch (mailError: unknown) {
      console.error('SMTP send error:', mailError)
      return NextResponse.json(
        {
          error:
            'Unable to send OTP email. Check SMTP credentials (for Gmail use 16-char App Password) and try again.',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: OTP_GENERIC_SENT_MESSAGE })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
