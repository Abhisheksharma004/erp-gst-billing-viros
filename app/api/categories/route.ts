import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { requirePermission } from '@/lib/api-auth'
import { appendOrgFilter } from '@/lib/tenant'
import { formatCategoryName, normalizeCategoryNameKey } from '@/lib/utils'
import { randomUUID } from 'crypto'

export async function GET(req: NextRequest) {
  const { error, organizationId } = await requirePermission('inventory', 'view')
  if (error) return error

  const conditions: string[] = []
  const params: any[] = []
  appendOrgFilter(conditions, params, organizationId!)
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''

  const [rows] = await db.execute(`SELECT * FROM categories ${where} ORDER BY BINARY name ASC`, params) as any[]
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const { error, organizationId } = await requirePermission('inventory', 'create')
  if (error) return error

  try {
    const { name, description } = await req.json()
    const formattedName = formatCategoryName(String(name || ''))

    if (!formattedName) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    console.log("====================================");
    console.log("Organization ID:", organizationId);
    console.log("Category Name:", formattedName);

    const conditions: string[] = []
    const params: any[] = []

    appendOrgFilter(conditions, params, organizationId!)

    console.log("WHERE Conditions:", conditions);
    console.log("Query Params:", params);

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''

    console.log("SQL:", `SELECT name FROM categories ${where}`);

    const [existing] = await db.execute(
      `SELECT name FROM categories ${where}`,
      params
    ) as any[]

    console.log("Existing Categories:", existing);

    const newKey = normalizeCategoryNameKey(formattedName)

    const duplicate = existing.find(
      (row: { name: string }) =>
        normalizeCategoryNameKey(row.name) === newKey
    )

    console.log("Duplicate Found:", duplicate);

    if (duplicate) {
      return NextResponse.json(
        { error: `Category "${duplicate.name}" already exists` },
        { status: 400 }
      )
    }

    const id = randomUUID()

    await db.execute(
      'INSERT INTO categories (id, organization_id, name, description) VALUES (?, ?, ?, ?)',
      [id, organizationId, formattedName, description || null]
    )

    console.log("Category Inserted Successfully");

    const [rows] = await db.execute(
      'SELECT * FROM categories WHERE id = ? AND organization_id = ?',
      [id, organizationId]
    ) as any[]

    return NextResponse.json(rows[0], { status: 201 })

  } catch (err: any) {
    console.error("ERROR:", err);

    if (err.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { error: 'Category already exists' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}