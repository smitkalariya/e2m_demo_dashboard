import { CustomerForm } from "@/features/customers/components/CustomerForm";

export default function CreateCustomerPage() {
  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">New customer</h1>
      <CustomerForm />
    </div>
  );
}
