"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchInteractions, setFilters } from "../interactionSlice";
import { customerService } from "@/services/customer.service";
import { formatDateTime } from "@/utils/date";
import { PageSpinner } from "@/components/feedback/Spinner";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import type { Customer } from "@/features/customers/types";

export function InteractionListView() {
  const dispatch = useAppDispatch();
  const { items, status, error, filters, page, totalPages } = useAppSelector((state) => state.interactions);
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    customerService
      .list({ page: 1, page_size: 100 })
      .then((result) => setCustomers(result.items))
      .catch(() => setCustomers([]));
  }, []);

  useEffect(() => {
    dispatch(fetchInteractions(filters));
  }, [dispatch, filters]);

  const customerOptions = [
    { label: "All customers", value: "" },
    ...customers.map((customer) => ({ label: customer.company_name, value: customer.id })),
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Interactions</h1>
        <p className="text-sm text-slate-500">All logged customer meetings, most recent first.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select
          options={customerOptions}
          value={filters.customer_id ?? ""}
          onChange={(event) =>
            dispatch(setFilters({ customer_id: event.target.value || undefined, page: 1 }))
          }
          className="w-56"
          aria-label="Filter by customer"
        />
        <Input
          type="date"
          value={filters.date_from ?? ""}
          onChange={(event) => dispatch(setFilters({ date_from: event.target.value || undefined, page: 1 }))}
          aria-label="From date"
          className="w-44"
        />
        <Input
          type="date"
          value={filters.date_to ?? ""}
          onChange={(event) => dispatch(setFilters({ date_to: event.target.value || undefined, page: 1 }))}
          aria-label="To date"
          className="w-44"
        />
        {(filters.customer_id || filters.date_from || filters.date_to) && (
          <Button
            variant="secondary"
            onClick={() =>
              dispatch(setFilters({ customer_id: undefined, date_from: undefined, date_to: undefined, page: 1 }))
            }
          >
            Clear filters
          </Button>
        )}
      </div>

      {status === "loading" && items.length === 0 && <PageSpinner />}

      {status === "failed" && items.length === 0 && (
        <ErrorState message={error ?? undefined} onRetry={() => dispatch(fetchInteractions(filters))} />
      )}

      {status !== "loading" && status !== "failed" && items.length === 0 && (
        <EmptyState title="No interactions logged yet" description="Log a meeting from a customer's page." />
      )}

      {items.length > 0 && (
        <div className="flex flex-col gap-2">
          {items.map((interaction) => (
            <Link
              key={interaction.id}
              href={`/interactions/${interaction.id}`}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 hover:border-slate-300 hover:bg-slate-50"
            >
              <div>
                <p className="font-medium text-slate-900">{interaction.title}</p>
                <p className="text-sm text-slate-500">{formatDateTime(interaction.meeting_date)}</p>
              </div>
              <span className="text-sm text-slate-400">View customer &rarr;</span>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="secondary" disabled={page <= 1} onClick={() => dispatch(setFilters({ page: page - 1 }))}>
            Previous
          </Button>
          <span className="text-sm text-slate-500">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="secondary"
            disabled={page >= totalPages}
            onClick={() => dispatch(setFilters({ page: page + 1 }))}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
