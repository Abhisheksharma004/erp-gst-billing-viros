import dynamic from 'next/dynamic'
import { FormPageLoader } from '@/components/layout/page-loader'

const QuotationForm = dynamic(
  () => import('@/components/quotations/quotation-form').then((m) => ({ default: m.QuotationForm })),
  { loading: () => <FormPageLoader title="quotation form" /> }
)

export default async function EditQuotationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <QuotationForm mode="edit" quotationId={id} />
}
