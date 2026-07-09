import mysql from 'mysql2/promise'

const globalForDb = globalThis as unknown as {
  mysqlPool?: mysql.Pool
  mysqlPoolKey?: string
}

const poolOptions: mysql.PoolOptions = {
  host: process.env.DB_HOST ?? '127.0.0.1',
  user: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME ?? 'viros_web_new',
  port: Number(process.env.DB_PORT ?? 3306),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+00:00',
}

const poolKey = [
  poolOptions.host,
  poolOptions.user,
  poolOptions.password,
  poolOptions.database,
  poolOptions.port,
].join('|')

let pool: mysql.Pool

if (!globalForDb.mysqlPool || globalForDb.mysqlPoolKey !== poolKey) {
  if (globalForDb.mysqlPool) {
    void globalForDb.mysqlPool.end()
  }
  pool = mysql.createPool(poolOptions)
  if (process.env.NODE_ENV !== 'production') {
    globalForDb.mysqlPool = pool
    globalForDb.mysqlPoolKey = poolKey
  }
} else {
  pool = globalForDb.mysqlPool
}

export function isDbConnectionError(error: unknown): boolean {
  const err = error as { code?: string; errno?: number }

  return (
    err?.code === 'ECONNREFUSED' ||
    err?.code === 'ENOTFOUND' ||
    err?.code === 'ETIMEDOUT' ||
    err?.code === 'PROTOCOL_CONNECTION_LOST' ||
    err?.code === 'ER_ACCESS_DENIED_ERROR' ||
    err?.errno === -4078 ||
    err?.errno === 1045
  )
}

/** MySQL 8+ rejects LIMIT/OFFSET as prepared-statement placeholders; inline safe integers instead. */
export function sqlLimit(limit: number, max = 500): number {
  const n = Number(limit)
  if (!Number.isFinite(n) || n < 1) return 20
  return Math.min(Math.floor(n), max)
}

export function sqlOffset(page: number, limit: number): number {
  const p = Number(page)
  const l = sqlLimit(limit)
  if (!Number.isFinite(p) || p < 1) return 0
  return Math.floor((p - 1) * l)
}

export function sqlPagination(limit: number, offset: number): string {
  const safeLimit = sqlLimit(limit)
  const safeOffset = Math.max(0, Math.floor(Number(offset) || 0))
  return `LIMIT ${safeLimit} OFFSET ${safeOffset}`
}

export function sqlLimitClause(limit: number): string {
  return `LIMIT ${sqlLimit(limit)}`
}

export default pool
