import { CustomerDetailView } from "@/features/customers/components/CustomerDetailView";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CustomerDetailView customerId={id} />;
}
