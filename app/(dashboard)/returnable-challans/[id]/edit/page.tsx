import dynamic from 'next/dynamic'
import { FormPageLoader } from '@/components/layout/page-loader'

const ReturnableChallanForm = dynamic(
  () =>
    import('@/components/returnable-challans/returnable-challan-form').then((m) => ({
      default: m.ReturnableChallanForm,
    })),
  { loading: () => <FormPageLoader title="returnable challan form" /> }
)

export default async function EditReturnableChallanPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <ReturnableChallanForm mode="edit" challanId={id} />
}
