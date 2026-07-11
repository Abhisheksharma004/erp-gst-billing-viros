import db from '@/lib/db'

export async function assertCustomerInOrg(
  customerId: string,
  organizationId: string
): Promise<boolean> {
  const [rows] = (await db.execute(
    'SELECT id FROM customers WHERE id = ? AND organization_id = ? LIMIT 1',
    [customerId, organizationId]
  )) as [{ id: string }[], unknown]
  return Boolean(rows[0])
}

export async function assertVendorInOrg(
  vendorId: string,
  organizationId: string
): Promise<boolean> {
  const [rows] = (await db.execute(
    'SELECT id FROM vendors WHERE id = ? AND organization_id = ? LIMIT 1',
    [vendorId, organizationId]
  )) as [{ id: string }[], unknown]
  return Boolean(rows[0])
}
