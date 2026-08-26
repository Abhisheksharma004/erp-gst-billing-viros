import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import db from '@/lib/db'
import { ensureActivityLogSchema } from '@/lib/ensure-activity-log-schema'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false }, { status: 200 })
    }

    await ensureActivityLogSchema()

    let body: { sessionId?: string; isClosing?: boolean } = {}
    try {
      const text = await req.text()
      if (text) {
        body = JSON.parse(text)
      }
    } catch {
      // ignore
    }

    const sessionId = body.sessionId
    const isClosing = Boolean(body.isClosing)

    if (!sessionId) {
      return NextResponse.json({ ok: false }, { status: 200 })
    }

    const newStatus = isClosing ? 'LOGGED_OUT' : 'ACTIVE'

    await db.execute(
      `UPDATE user_activity_logs
       SET last_active_at = NOW(),
           duration_seconds = TIMESTAMPDIFF(SECOND, login_at, NOW()),
           status = ?
       WHERE session_id = ? AND user_id = ?`,
      [newStatus, sessionId, session.user.id]
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    // Silent fail
    return NextResponse.json({ ok: false }, { status: 200 })
  }
}
