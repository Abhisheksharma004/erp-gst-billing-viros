import dynamic from 'next/dynamic'
import { FormPageLoader } from '@/components/layout/page-loader'

const InvoiceForm = dynamic(
  () => import('@/components/billing/invoice-form').then((m) => ({ default: m.InvoiceForm })),
  { loading: () => <FormPageLoader title="invoice form" /> }
)

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <InvoiceForm invoiceId={id} />
}
