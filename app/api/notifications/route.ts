import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { requirePermission } from '@/lib/api-auth'
import { appendOrgFilter } from '@/lib/tenant'

export async function GET(req: NextRequest) {
  const { error, organizationId } = await requirePermission('inventory', 'view')
  if (error) return error

  try {
    const conditions: string[] = ['p.is_active = 1', 'p.current_stock <= p.low_stock_alert']
    const params: any[] = []
    appendOrgFilter(conditions, params, organizationId!, 'p')

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''

    const [rows] = (await db.execute(
      `SELECT p.id, p.name, p.sku, p.current_stock, p.low_stock_alert, c.name as category_name, u.name as unit_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN units u ON p.unit_id = u.id
       ${where}
       ORDER BY p.current_stock ASC, p.name ASC
       LIMIT 50`,
      params
    )) as any[]

    return NextResponse.json({
      lowStockItems: rows || [],
      lowStockCount: rows?.length || 0,
    })
  } catch (err: any) {
    console.error('Notifications API error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
