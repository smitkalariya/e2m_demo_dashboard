import { EditCustomerView } from "@/features/customers/components/EditCustomerView";

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditCustomerView customerId={id} />;
}
