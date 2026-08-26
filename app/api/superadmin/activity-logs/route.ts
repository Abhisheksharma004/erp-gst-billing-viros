import { NextRequest, NextResponse } from 'next/server'
import db, { sqlPagination } from '@/lib/db'
import { requireSuperAdmin } from '@/lib/superadmin-auth'
import { ensureActivityLogSchema } from '@/lib/ensure-activity-log-schema'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { error } = await requireSuperAdmin()
  if (error) return error

  try {
    await ensureActivityLogSchema()

    // 1. Automatically update timed-out sessions (> 5 mins since last heartbeat)
    await db.execute(`
      UPDATE user_activity_logs
      SET status = 'TIMEOUT'
      WHERE status = 'ACTIVE' AND last_active_at < NOW() - INTERVAL 5 MINUTE
    `).catch(() => {})

    // Normalize any past IPv6 loopback addresses to 32-bit IPv4
    await db.execute(`
      UPDATE user_activity_logs
      SET ip_address = '127.0.0.1'
      WHERE ip_address IN ('::1', '::ffff:127.0.0.1')
    `).catch(() => {})

    const url = new URL(req.url)
    const search = (url.searchParams.get('search') || '').trim()
    const organizationId = (url.searchParams.get('organizationId') || '').trim()
    const statusFilter = (url.searchParams.get('status') || '').trim()
    const dateRange = (url.searchParams.get('dateRange') || 'all').trim()
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '25', 10)))
    const offset = (page - 1) * limit

    // Build WHERE clause
    const conditions: string[] = []
    const params: (string | number)[] = []

    if (search) {
      conditions.push(`(
        user_name LIKE ? OR 
        user_email LIKE ? OR 
        organization_name LIKE ? OR 
        ip_address LIKE ? OR 
        browser LIKE ? OR 
        os LIKE ?
      )`)
      const pattern = `%${search}%`
      params.push(pattern, pattern, pattern, pattern, pattern, pattern)
    }

    if (organizationId && organizationId !== 'ALL') {
      conditions.push('organization_id = ?')
      params.push(organizationId)
    }

    if (statusFilter && statusFilter !== 'ALL') {
      conditions.push('status = ?')
      params.push(statusFilter)
    }

    if (dateRange === 'today') {
      conditions.push('DATE(login_at) = CURDATE()')
    } else if (dateRange === '7d') {
      conditions.push('login_at >= NOW() - INTERVAL 7 DAY')
    } else if (dateRange === '30d') {
      conditions.push('login_at >= NOW() - INTERVAL 30 DAY')
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // 2. Fetch Total Count
    const [countRows] = (await db.execute(
      `SELECT COUNT(*) as total FROM user_activity_logs ${whereClause}`,
      params
    )) as [{ total: number }[], unknown]
    const totalCount = Number(countRows[0]?.total ?? 0)

    // 3. Fetch Paginated Logs (using sqlPagination to avoid MySQL LIMIT placeholder bug)
    const [logRows] = (await db.execute(
      `SELECT 
        id,
        user_id as userId,
        user_name as userName,
        user_email as userEmail,
        user_role as userRole,
        organization_id as organizationId,
        organization_name as organizationName,
        session_id as sessionId,
        ip_address as ipAddress,
        browser,
        os,
        device,
        user_agent as userAgent,
        DATE_FORMAT(login_at, '%Y-%m-%d %H:%i:%s') as loginAt,
        DATE_FORMAT(last_active_at, '%Y-%m-%d %H:%i:%s') as lastActiveAt,
        duration_seconds as durationSeconds,
        status
       FROM user_activity_logs
       ${whereClause}
       ORDER BY login_at DESC
       ${sqlPagination(limit, offset)}`,
      params
    )) as [Record<string, unknown>[], unknown]

    // 4. Fetch Quick Stats
    const [[statsRow]] = (await db.execute(`
      SELECT 
        COUNT(CASE WHEN DATE(login_at) = CURDATE() THEN 1 END) as loginsToday,
        COUNT(CASE WHEN status = 'ACTIVE' AND last_active_at >= NOW() - INTERVAL 3 MINUTE THEN 1 END) as onlineUsers,
        COUNT(DISTINCT user_email) as totalUniqueUsers,
        COALESCE(AVG(duration_seconds), 0) as avgDurationSeconds
      FROM user_activity_logs
    `)) as [{ loginsToday: number; onlineUsers: number; totalUniqueUsers: number; avgDurationSeconds: number }[], unknown]

    // 5. Fetch Organization List for filtering
    const [orgRows] = (await db.execute(`
      SELECT DISTINCT id, name FROM organizations ORDER BY name ASC
    `)) as [{ id: string; name: string }[], unknown]

    return NextResponse.json({
      logs: (logRows || []).map((row) => ({
        id: String(row.id),
        userId: String(row.userId),
        userName: String(row.userName || 'User'),
        userEmail: String(row.userEmail || ''),
        userRole: String(row.userRole || 'STAFF'),
        organizationId: row.organizationId ? String(row.organizationId) : null,
        organizationName: row.organizationName ? String(row.organizationName) : 'Super Admin / Direct',
        sessionId: String(row.sessionId || ''),
        ipAddress: (!row.ipAddress || row.ipAddress === '::1' || row.ipAddress === '::ffff:127.0.0.1')
          ? '127.0.0.1'
          : String(row.ipAddress).replace(/^::ffff:/, ''),
        browser: String(row.browser || 'Unknown'),
        os: String(row.os || 'Unknown'),
        device: String(row.device || 'Desktop'),
        userAgent: String(row.userAgent || ''),
        loginAt: row.loginAt,
        lastActiveAt: row.lastActiveAt,
        durationSeconds: Number(row.durationSeconds || 0),
        status: String(row.status || 'ACTIVE'),
      })),
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
      stats: {
        loginsToday: Number(statsRow?.loginsToday ?? 0),
        onlineUsers: Number(statsRow?.onlineUsers ?? 0),
        totalUniqueUsers: Number(statsRow?.totalUniqueUsers ?? 0),
        avgDurationSeconds: Math.round(Number(statsRow?.avgDurationSeconds ?? 0)),
      },
      organizations: orgRows.map((o) => ({ id: o.id, name: o.name })),
    })
  } catch (err: unknown) {
    console.error('GET /api/superadmin/activity-logs error:', err)
    const msg = err instanceof Error ? err.message : 'Failed to fetch activity logs'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
