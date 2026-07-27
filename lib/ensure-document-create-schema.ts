import { ensureOrganizationSchema } from '@/lib/ensure-organization-schema'
import { ensureBusinessSettingsBankingColumns } from '@/lib/ensure-business-settings-schema'
import { ensureDocumentNumberConstraints } from '@/lib/ensure-document-number-constraints'

/** Run before creating any tenant document (quotation, purchase, challan, etc.). */
export async function ensureDocumentCreateSchema(): Promise<void> {
  await ensureOrganizationSchema()
  await ensureBusinessSettingsBankingColumns()
  await ensureDocumentNumberConstraints()
}
