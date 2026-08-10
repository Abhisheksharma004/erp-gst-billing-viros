import dynamic from 'next/dynamic'
import { FormPageLoader } from '@/components/layout/page-loader'

const InvoiceForm = dynamic(
  () => import('@/components/billing/invoice-form').then((m) => ({ default: m.InvoiceForm })),
  { loading: () => <FormPageLoader title="invoice form" /> }
)

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ fromQuotationId?: string }>
}) {
  const { fromQuotationId } = await searchParams
  return <InvoiceForm fromQuotationId={fromQuotationId} />
}
