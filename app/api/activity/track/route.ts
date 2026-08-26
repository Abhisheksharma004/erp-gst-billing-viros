import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import db from '@/lib/db'
import { ensureActivityLogSchema } from '@/lib/ensure-activity-log-schema'
import { parseUserAgent, extractClientIp } from '@/lib/user-agent'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, error: 'Unauthenticated' }, { status: 200 })
    }

    await ensureActivityLogSchema()

    const body = await req.json().catch(() => ({}))
    const sessionId = (body?.sessionId as string) || randomUUID()

    const userAgent = req.headers.get('user-agent') || ''
    const { browser, os, device } = parseUserAgent(userAgent)
    const ipAddress = extractClientIp(req.headers)

    const userId = session.user.id
    const userName = session.user.name || 'User'
    const userEmail = session.user.email || ''
    const userRole = session.user.role || (session.user.isSuperAdmin ? 'SUPER_ADMIN' : 'STAFF')
    const organizationId = session.user.organizationId || null
    const organizationName = session.user.organizationName || null

    // Check if there is an existing active session log for this sessionId
    const [existingRows] = (await db.execute(
      `SELECT id, login_at FROM user_activity_logs WHERE session_id = ? AND user_id = ? LIMIT 1`,
      [sessionId, userId]
    )) as [{ id: string; login_at: Date }[], unknown]

    if (existingRows[0]) {
      // Update last active
      await db.execute(
        `UPDATE user_activity_logs 
         SET last_active_at = NOW(),
             duration_seconds = TIMESTAMPDIFF(SECOND, login_at, NOW()),
             status = 'ACTIVE',
             ip_address = ?,
             browser = ?,
             os = ?,
             device = ?
         WHERE id = ?`,
        [ipAddress, browser, os, device, existingRows[0].id]
      )
      return NextResponse.json({ ok: true, sessionId, logId: existingRows[0].id })
    }

    // Insert new session log
    const logId = randomUUID()
    await db.execute(
      `INSERT INTO user_activity_logs (
        id, user_id, user_name, user_email, user_role,
        organization_id, organization_name, session_id,
        ip_address, browser, os, device, user_agent,
        login_at, last_active_at, duration_seconds, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 0, 'ACTIVE')`,
      [
        logId,
        userId,
        userName,
        userEmail,
        userRole,
        organizationId,
        organizationName,
        sessionId,
        ipAddress,
        browser,
        os,
        device,
        userAgent,
      ]
    )

    return NextResponse.json({ ok: true, sessionId, logId })
  } catch (error) {
    // Silent fail so user experience is never interrupted
    console.error('Silent activity track error:', error)
    return NextResponse.json({ ok: false }, { status: 200 })
  }
}
