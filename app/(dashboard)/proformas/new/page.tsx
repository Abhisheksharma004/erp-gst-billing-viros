import dynamic from 'next/dynamic'
import { FormPageLoader } from '@/components/layout/page-loader'

const ProformaForm = dynamic(
  () => import('@/components/proformas/proforma-form').then((m) => ({ default: m.ProformaForm })),
  { loading: () => <FormPageLoader title="proforma form" /> }
)

export default function NewProformaPage() {
  return <ProformaForm mode="create" />
}
