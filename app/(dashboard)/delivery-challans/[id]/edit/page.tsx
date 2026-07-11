import dynamic from 'next/dynamic'
import { FormPageLoader } from '@/components/layout/page-loader'

const DeliveryChallanForm = dynamic(
  () =>
    import('@/components/delivery-challans/delivery-challan-form').then((m) => ({
      default: m.DeliveryChallanForm,
    })),
  { loading: () => <FormPageLoader title="delivery challan form" /> }
)

export default async function EditDeliveryChallanPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <DeliveryChallanForm mode="edit" challanId={id} />
}
