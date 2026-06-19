"use client";

import { useCallback, useEffect, useState } from "react";
import { customerService } from "@/services/customer.service";
import { extractErrorMessage } from "@/services/axios";
import { PageSpinner } from "@/components/feedback/Spinner";
import { ErrorState } from "@/components/feedback/ErrorState";
import { CustomerForm } from "./CustomerForm";
import type { Customer } from "../types";

export function EditCustomerView({ customerId }: { customerId: string }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(() => {
    customerService
      .get(customerId)
      .then((data) => {
        setCustomer(data);
        setError(null);
      })
      .catch((err) => setError(extractErrorMessage(err, "Failed to load customer")))
      .finally(() => setIsLoading(false));
  }, [customerId]);

  useEffect(() => {
    load();
  }, [load]);

  if (isLoading) return <PageSpinner />;
  if (error || !customer) return <ErrorState message={error ?? undefined} onRetry={load} />;

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Edit customer</h1>
      <CustomerForm customer={customer} />
    </div>
  );
}
