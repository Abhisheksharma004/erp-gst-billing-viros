import dynamic from 'next/dynamic'
import { FormPageLoader } from '@/components/layout/page-loader'

const ProformaForm = dynamic(
  () => import('@/components/proformas/proforma-form').then((m) => ({ default: m.ProformaForm })),
  { loading: () => <FormPageLoader title="proforma form" /> }
)

export default async function NewProformaPage({
  searchParams,
}: {
  searchParams: Promise<{ fromQuotationId?: string }>
}) {
  const { fromQuotationId } = await searchParams
  return <ProformaForm mode="create" fromQuotationId={fromQuotationId} />
}
