import { NextResponse } from 'next/server'

function exposeSqlDetails(): boolean {
  return (
    process.env.NODE_ENV === 'development' ||
    process.env.APP_DEBUG_SQL === '1' ||
    process.env.APP_DEBUG_SQL === 'true'
  )
}

export function apiErrorResponse(err: unknown, context: string) {
  const error = err as { code?: string; message?: string; sqlMessage?: string; errno?: number }
  console.error(context, error?.code, error?.message ?? error?.sqlMessage ?? err)

  let message = 'Internal server error'
  if (error?.code === 'ER_CON_COUNT_ERROR') {
    message = 'Database is busy. Please wait a moment and try again.'
  } else if (error?.code === 'ER_DUP_ENTRY') {
    message = 'A record with this number already exists. Refresh and try again.'
  } else if (exposeSqlDetails() && (error?.sqlMessage || error?.message)) {
    message = String(error.sqlMessage || error.message)
  }

  return NextResponse.json({ error: message }, { status: 500 })
}
