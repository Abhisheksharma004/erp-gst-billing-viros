import dynamic from 'next/dynamic'
import { FormPageLoader } from '@/components/layout/page-loader'

const PurchaseOrderForm = dynamic(
  () =>
    import('@/components/purchase-orders/purchase-order-form').then((m) => ({
      default: m.PurchaseOrderForm,
    })),
  { loading: () => <FormPageLoader title="purchase order form" /> }
)

export default async function EditPurchaseOrderPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <PurchaseOrderForm purchaseOrderId={id} />
}
