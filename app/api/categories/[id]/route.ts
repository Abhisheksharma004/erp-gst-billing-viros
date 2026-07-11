import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { requirePermission } from '@/lib/api-auth'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { error, organizationId } = await requirePermission('inventory', 'delete')
  if (error) return error
  try {
    const [rows] = await db.execute(
      'SELECT id FROM categories WHERE id = ? AND organization_id = ?',
      [id, organizationId]
    ) as any[]
    if (!rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await db.execute(
      'UPDATE products SET category_id = NULL WHERE category_id = ? AND organization_id = ?',
      [id, organizationId]
    )
    await db.execute(
      'DELETE FROM categories WHERE id = ? AND organization_id = ?',
      [id, organizationId]
    )
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error('DELETE /api/categories/[id]:', err)
    return NextResponse.json({ error: 'Cannot delete category' }, { status: 500 })
  }
}
