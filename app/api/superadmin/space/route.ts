import { NextResponse } from 'next/server'
import db from '@/lib/db'
import { requireSuperAdmin } from '@/lib/superadmin-auth'
import { ensureOrganizationSchema } from '@/lib/ensure-organization-schema'
import { ensureOrganizationDetailsSchema } from '@/lib/ensure-organization-details-schema'

export interface TableStorageMeta {
  tableName: string
  tableRows: number
  dataLength: number
  indexLength: number
  totalLength: number
  avgRowBytes: number
}

export interface CategoryBreakdown {
  invoicesAndSalesBytes: number
  inventoryAndProductsBytes: number
  purchasesAndVendorsBytes: number
  customersBytes: number
  settingsAndMediaBytes: number
  membersAndSystemBytes: number
}

export interface OrgSpaceUsage {
  id: string
  name: string
  slug: string
  status: string
  plan: string
  ownerName: string | null
  ownerEmail: string | null
  createdAt: string
  totalBytes: number
  formattedSize: string
  percentageOfTotal: number
  totalRecords: number
  breakdown: CategoryBreakdown
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const val = bytes / Math.pow(k, i)
  return `${val < 10 ? val.toFixed(2) : val.toFixed(1)} ${sizes[i]}`
}

async function safeQueryCountGroup(sql: string): Promise<Map<string, { count: number; extraBytes?: number }>> {
  const map = new Map<string, { count: number; extraBytes?: number }>()
  try {
    const [rows] = (await db.execute(sql)) as [Record<string, unknown>[], unknown]
    for (const r of rows) {
      if (r.organization_id != null) {
        const orgId = String(r.organization_id)
        const cnt = Number(r.cnt ?? 0)
        const extraBytes = r.extra_bytes != null ? Number(r.extra_bytes) : 0
        map.set(orgId, { count: cnt, extraBytes })
      }
    }
  } catch {
    // If table doesn't exist yet or query fails, default to empty map
  }
  return map
}

export async function GET() {
  const { error } = await requireSuperAdmin()
  if (error) return error

  await ensureOrganizationSchema()
  await ensureOrganizationDetailsSchema()

  // 1. Get database storage info from information_schema.TABLES
  const [tableStats] = (await db.execute(
    `SELECT
       TABLE_NAME as tableName,
       COALESCE(TABLE_ROWS, 0) as tableRows,
       COALESCE(DATA_LENGTH, 0) as dataLength,
       COALESCE(INDEX_LENGTH, 0) as indexLength,
       COALESCE(DATA_LENGTH + INDEX_LENGTH, 0) as totalLength,
       COALESCE(AVG_ROW_LENGTH, 0) as avgRowLength
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE()`
  )) as [
    {
      tableName: string
      tableRows: number
      dataLength: number
      indexLength: number
      totalLength: number
      avgRowLength: number
    }[],
    unknown,
  ]

  const tableMetaMap = new Map<string, TableStorageMeta>()
  let dbTotalDataBytes = 0
  let dbTotalIndexBytes = 0
  let dbTotalSizeBytes = 0
  let totalDbRows = 0

  for (const t of tableStats) {
    const totalLen = Number(t.totalLength)
    const dataLen = Number(t.dataLength)
    const idxLen = Number(t.indexLength)
    const rows = Number(t.tableRows)
    dbTotalDataBytes += dataLen
    dbTotalIndexBytes += idxLen
    dbTotalSizeBytes += totalLen
    totalDbRows += rows

    let avgBytes = Number(t.avgRowLength)
    if (avgBytes <= 0 && rows > 0) {
      avgBytes = Math.ceil(totalLen / rows)
    } else if (avgBytes <= 0) {
      avgBytes = 128 // reasonable default fallback per row in bytes
    }

    tableMetaMap.set(t.tableName.toLowerCase(), {
      tableName: t.tableName,
      tableRows: rows,
      dataLength: dataLen,
      indexLength: idxLen,
      totalLength: totalLen,
      avgRowBytes: avgBytes,
    })
  }

  // 2. Fetch all organizations
  const [orgRows] = (await db.execute(
    `SELECT
       id, name, slug, status, plan,
       owner_name as ownerName,
       owner_email as ownerEmail,
       created_at as createdAt
     FROM organizations
     ORDER BY created_at DESC`
  )) as [Record<string, unknown>[], unknown]

  // Helper function to get row byte estimate for a table
  const getAvgRowBytes = (tableName: string) => {
    return tableMetaMap.get(tableName.toLowerCase())?.avgRowBytes ?? 150
  }

  // 3. Gather row counts per organization across all tables
  const invoicesCount = await safeQueryCountGroup(`SELECT organization_id, COUNT(*) as cnt FROM invoices GROUP BY organization_id`)
  const invoiceItemsCount = await safeQueryCountGroup(
    `SELECT i.organization_id, COUNT(*) as cnt FROM invoice_items ii JOIN invoices i ON i.id = ii.invoice_id GROUP BY i.organization_id`
  )
  const productsCount = await safeQueryCountGroup(`SELECT organization_id, COUNT(*) as cnt FROM products GROUP BY organization_id`)
  const stockMovementsCount = await safeQueryCountGroup(
    `SELECT p.organization_id, COUNT(*) as cnt FROM stock_movements sm JOIN products p ON p.id = sm.product_id GROUP BY p.organization_id`
  )
  const customersCount = await safeQueryCountGroup(`SELECT organization_id, COUNT(*) as cnt FROM customers GROUP BY organization_id`)
  const vendorsCount = await safeQueryCountGroup(`SELECT organization_id, COUNT(*) as cnt FROM vendors GROUP BY organization_id`)
  const quotationsCount = await safeQueryCountGroup(`SELECT organization_id, COUNT(*) as cnt FROM quotations GROUP BY organization_id`)
  const quotationItemsCount = await safeQueryCountGroup(
    `SELECT q.organization_id, COUNT(*) as cnt FROM quotation_items qi JOIN quotations q ON q.id = qi.quotation_id GROUP BY q.organization_id`
  )
  const purchaseOrdersCount = await safeQueryCountGroup(`SELECT organization_id, COUNT(*) as cnt FROM purchase_orders GROUP BY organization_id`)
  const poItemsCount = await safeQueryCountGroup(
    `SELECT po.organization_id, COUNT(*) as cnt FROM purchase_order_items poi JOIN purchase_orders po ON po.id = poi.purchase_order_id GROUP BY po.organization_id`
  )
  const purchasesCount = await safeQueryCountGroup(`SELECT organization_id, COUNT(*) as cnt FROM purchases GROUP BY organization_id`)
  const purchaseItemsCount = await safeQueryCountGroup(
    `SELECT p.organization_id, COUNT(*) as cnt FROM purchase_items pi JOIN purchases p ON p.id = pi.purchase_id GROUP BY p.organization_id`
  )
  const deliveryChallansCount = await safeQueryCountGroup(`SELECT organization_id, COUNT(*) as cnt FROM delivery_challans GROUP BY organization_id`)
  const challanItemsCount = await safeQueryCountGroup(
    `SELECT dc.organization_id, COUNT(*) as cnt FROM challan_items ci JOIN delivery_challans dc ON dc.id = ci.challan_id GROUP BY dc.organization_id`
  )
  const returnableChallansCount = await safeQueryCountGroup(`SELECT organization_id, COUNT(*) as cnt FROM returnable_challans GROUP BY organization_id`)
  const returnableItemsCount = await safeQueryCountGroup(
    `SELECT rc.organization_id, COUNT(*) as cnt FROM returnable_challan_items rci JOIN returnable_challans rc ON rc.id = rci.challan_id GROUP BY rc.organization_id`
  )
  const paymentsCount = await safeQueryCountGroup(`SELECT organization_id, COUNT(*) as cnt FROM payments GROUP BY organization_id`)
  const categoriesCount = await safeQueryCountGroup(`SELECT organization_id, COUNT(*) as cnt FROM categories GROUP BY organization_id`)
  const brandsCount = await safeQueryCountGroup(`SELECT organization_id, COUNT(*) as cnt FROM brands GROUP BY organization_id`)
  const settingsCount = await safeQueryCountGroup(
    `SELECT organization_id, COUNT(*) as cnt, SUM(OCTET_LENGTH(COALESCE(logo, ''))) as extra_bytes FROM business_settings GROUP BY organization_id`
  )
  const membersCount = await safeQueryCountGroup(`SELECT organization_id, COUNT(*) as cnt FROM organization_members GROUP BY organization_id`)
  const rolesCount = await safeQueryCountGroup(`SELECT organization_id, COUNT(*) as cnt FROM roles GROUP BY organization_id`)

  // Pre-calculate per-table avg bytes
  const bytesInvoices = getAvgRowBytes('invoices')
  const bytesInvoiceItems = getAvgRowBytes('invoice_items')
  const bytesProducts = getAvgRowBytes('products')
  const bytesStockMovements = getAvgRowBytes('stock_movements')
  const bytesCustomers = getAvgRowBytes('customers')
  const bytesVendors = getAvgRowBytes('vendors')
  const bytesQuotations = getAvgRowBytes('quotations')
  const bytesQuotationItems = getAvgRowBytes('quotation_items')
  const bytesPurchaseOrders = getAvgRowBytes('purchase_orders')
  const bytesPoItems = getAvgRowBytes('purchase_order_items')
  const bytesPurchases = getAvgRowBytes('purchases')
  const bytesPurchaseItems = getAvgRowBytes('purchase_items')
  const bytesDeliveryChallans = getAvgRowBytes('delivery_challans')
  const bytesChallanItems = getAvgRowBytes('challan_items')
  const bytesReturnableChallans = getAvgRowBytes('returnable_challans')
  const bytesReturnableItems = getAvgRowBytes('returnable_challan_items')
  const bytesPayments = getAvgRowBytes('payments')
  const bytesCategories = getAvgRowBytes('categories')
  const bytesBrands = getAvgRowBytes('brands')
  const bytesSettings = getAvgRowBytes('business_settings')
  const bytesMembers = getAvgRowBytes('organization_members')
  const bytesRoles = getAvgRowBytes('roles')

  let totalTenantBytesAll = 0

  const organizations: OrgSpaceUsage[] = orgRows.map((org) => {
    const orgId = String(org.id)

    const cInv = invoicesCount.get(orgId)?.count ?? 0
    const cInvItems = invoiceItemsCount.get(orgId)?.count ?? 0
    const cQuot = quotationsCount.get(orgId)?.count ?? 0
    const cQuotItems = quotationItemsCount.get(orgId)?.count ?? 0
    const cDelChallan = deliveryChallansCount.get(orgId)?.count ?? 0
    const cChallanItems = challanItemsCount.get(orgId)?.count ?? 0
    const cRetChallan = returnableChallansCount.get(orgId)?.count ?? 0
    const cRetItems = returnableItemsCount.get(orgId)?.count ?? 0
    const cPay = paymentsCount.get(orgId)?.count ?? 0

    const invoicesAndSalesBytes =
      cInv * bytesInvoices +
      cInvItems * bytesInvoiceItems +
      cQuot * bytesQuotations +
      cQuotItems * bytesQuotationItems +
      cDelChallan * bytesDeliveryChallans +
      cChallanItems * bytesChallanItems +
      cRetChallan * bytesReturnableChallans +
      cRetItems * bytesReturnableItems +
      cPay * bytesPayments

    const cProd = productsCount.get(orgId)?.count ?? 0
    const cStock = stockMovementsCount.get(orgId)?.count ?? 0
    const cCat = categoriesCount.get(orgId)?.count ?? 0
    const cBrand = brandsCount.get(orgId)?.count ?? 0

    const inventoryAndProductsBytes =
      cProd * bytesProducts +
      cStock * bytesStockMovements +
      cCat * bytesCategories +
      cBrand * bytesBrands

    const cPur = purchasesCount.get(orgId)?.count ?? 0
    const cPurItems = purchaseItemsCount.get(orgId)?.count ?? 0
    const cPo = purchaseOrdersCount.get(orgId)?.count ?? 0
    const cPoItems = poItemsCount.get(orgId)?.count ?? 0
    const cVen = vendorsCount.get(orgId)?.count ?? 0

    const purchasesAndVendorsBytes =
      cPur * bytesPurchases +
      cPurItems * bytesPurchaseItems +
      cPo * bytesPurchaseOrders +
      cPoItems * bytesPoItems +
      cVen * bytesVendors

    const cCust = customersCount.get(orgId)?.count ?? 0
    const customersBytes = cCust * bytesCustomers

    const cSetData = settingsCount.get(orgId)
    const cSet = cSetData?.count ?? 0
    const cSetExtraLogo = cSetData?.extraBytes ?? 0
    const settingsAndMediaBytes = cSet * bytesSettings + cSetExtraLogo

    const cMem = membersCount.get(orgId)?.count ?? 0
    const cRol = rolesCount.get(orgId)?.count ?? 0
    const membersAndSystemBytes = cMem * bytesMembers + cRol * bytesRoles

    const totalBytes =
      invoicesAndSalesBytes +
      inventoryAndProductsBytes +
      purchasesAndVendorsBytes +
      customersBytes +
      settingsAndMediaBytes +
      membersAndSystemBytes

    totalTenantBytesAll += totalBytes

    const totalRecords =
      cInv +
      cInvItems +
      cQuot +
      cQuotItems +
      cDelChallan +
      cChallanItems +
      cRetChallan +
      cRetItems +
      cPay +
      cProd +
      cStock +
      cCat +
      cBrand +
      cPur +
      cPurItems +
      cPo +
      cPoItems +
      cVen +
      cCust +
      cSet +
      cMem +
      cRol

    const pct = dbTotalSizeBytes > 0 ? (totalBytes / dbTotalSizeBytes) * 100 : 0

    return {
      id: orgId,
      name: String(org.name ?? ''),
      slug: String(org.slug ?? ''),
      status: String(org.status ?? 'ACTIVE'),
      plan: String(org.plan ?? 'free'),
      ownerName: org.ownerName != null ? String(org.ownerName) : null,
      ownerEmail: org.ownerEmail != null ? String(org.ownerEmail) : null,
      createdAt: String(org.createdAt),
      totalBytes,
      formattedSize: formatBytes(totalBytes),
      percentageOfTotal: Number(pct.toFixed(2)),
      totalRecords,
      breakdown: {
        invoicesAndSalesBytes,
        inventoryAndProductsBytes,
        purchasesAndVendorsBytes,
        customersBytes,
        settingsAndMediaBytes,
        membersAndSystemBytes,
      },
    }
  })

  // Sort organizations by totalBytes descending by default
  organizations.sort((a, b) => b.totalBytes - a.totalBytes)

  const systemOverheadBytes = Math.max(0, dbTotalSizeBytes - totalTenantBytesAll)

  return NextResponse.json({
    summary: {
      totalDatabaseSizeBytes: dbTotalSizeBytes,
      formattedTotalDatabaseSize: formatBytes(dbTotalSizeBytes),
      totalDataSizeBytes: dbTotalDataBytes,
      formattedTotalDataSize: formatBytes(dbTotalDataBytes),
      totalIndexSizeBytes: dbTotalIndexBytes,
      formattedTotalIndexSize: formatBytes(dbTotalIndexBytes),
      totalTenantSizeBytes: totalTenantBytesAll,
      formattedTotalTenantSize: formatBytes(totalTenantBytesAll),
      systemOverheadBytes,
      formattedSystemOverheadSize: formatBytes(systemOverheadBytes),
      totalOrganizationsCount: organizations.length,
      averageSpacePerOrgBytes:
        organizations.length > 0 ? Math.round(totalTenantBytesAll / organizations.length) : 0,
      formattedAverageSpacePerOrg: formatBytes(
        organizations.length > 0 ? Math.round(totalTenantBytesAll / organizations.length) : 0
      ),
      totalDbRows,
      highestConsumer: organizations[0]
        ? {
            id: organizations[0].id,
            name: organizations[0].name,
            formattedSize: organizations[0].formattedSize,
            percentage: organizations[0].percentageOfTotal,
          }
        : null,
    },
    organizations,
    tables: Array.from(tableMetaMap.values()).map((t) => ({
      ...t,
      formattedTotalLength: formatBytes(t.totalLength),
    })),
  })
}
