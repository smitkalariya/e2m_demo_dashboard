"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { customerService } from "@/services/customer.service";
import { interactionService } from "@/services/interaction.service";
import { extractErrorMessage } from "@/services/axios";
import { useAuth } from "@/hooks/useAuth";
import { MANAGE_CUSTOMERS_ROLES } from "@/constants/roles";
import { PageSpinner } from "@/components/feedback/Spinner";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Button } from "@/components/ui/Button";
import { CustomerStatusBadge } from "./CustomerStatusBadge";
import { InteractionForm } from "@/features/interactions/components/InteractionForm";
import { InteractionListItem } from "@/features/interactions/components/InteractionListItem";
import type { Customer } from "../types";
import type { Interaction } from "@/features/interactions/types";

export function CustomerDetailView({ customerId }: { customerId: string }) {
  const router = useRouter();
  const { hasRole } = useAuth();
  const canManageCustomer = hasRole(...MANAGE_CUSTOMERS_ROLES);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = useCallback(() => {
    Promise.all([
      customerService.get(customerId),
      interactionService.list({ customer_id: customerId, page_size: 50 }),
    ])
      .then(([customerData, interactionData]) => {
        setCustomer(customerData);
        setInteractions(interactionData.items);
        setError(null);
      })
      .catch((err) => setError(extractErrorMessage(err, "Failed to load customer")))
      .finally(() => setIsLoading(false));
  }, [customerId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async () => {
    if (!window.confirm("Delete this customer? This will also remove their interactions.")) return;
    setIsDeleting(true);
    try {
      await customerService.remove(customerId);
      router.push("/customers");
    } catch (err) {
      setError(extractErrorMessage(err, "Failed to delete customer"));
      setIsDeleting(false);
    }
  };

  if (isLoading) return <PageSpinner />;
  if (error || !customer) return <ErrorState message={error ?? undefined} onRetry={load} />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{customer.company_name}</h1>
          <div className="mt-2 flex items-center gap-3">
            <CustomerStatusBadge status={customer.status} />
            <span className="text-sm text-slate-500">{customer.contact_name}</span>
            <span className="text-sm text-slate-500">{customer.email}</span>
            {customer.phone && <span className="text-sm text-slate-500">{customer.phone}</span>}
          </div>
        </div>
        {canManageCustomer && (
          <div className="flex gap-2">
            <Link href={`/customers/${customer.id}/edit`}>
              <Button variant="secondary">Edit</Button>
            </Link>
            <Button variant="danger" onClick={handleDelete} isLoading={isDeleting}>
              Delete
            </Button>
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Interactions</h2>
          {!isFormOpen && <Button onClick={() => setIsFormOpen(true)}>Log interaction</Button>}
        </div>

        {isFormOpen && (
          <div className="mt-3">
            <InteractionForm
              customerId={customer.id}
              onCreated={(interaction) => {
                setInteractions((prev) => [interaction, ...prev]);
                setIsFormOpen(false);
              }}
              onCancel={() => setIsFormOpen(false)}
            />
          </div>
        )}

        <div className="mt-3 flex flex-col gap-2">
          {interactions.length === 0 ? (
            <EmptyState title="No interactions yet" description="Log a meeting to generate an AI insight." />
          ) : (
            interactions.map((interaction) => (
              <InteractionListItem key={interaction.id} interaction={interaction} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
