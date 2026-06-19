"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchCustomers, setFilters } from "../customerSlice";
import { useAuth } from "@/hooks/useAuth";
import { MANAGE_CUSTOMERS_ROLES } from "@/constants/roles";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { PageSpinner } from "@/components/feedback/Spinner";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { CustomerStatusBadge } from "./CustomerStatusBadge";
import { customerStatusOptions } from "../validation";
import type { CustomerSortField, CustomerStatus, SortOrder } from "../types";

const STATUS_FILTER_OPTIONS = [{ label: "All statuses", value: "" }, ...customerStatusOptions.map((value) => ({ label: value, value }))];

const SORT_OPTIONS = [
  { label: "Newest first", value: "created_at:desc" },
  { label: "Oldest first", value: "created_at:asc" },
  { label: "Company A-Z", value: "company_name:asc" },
  { label: "Company Z-A", value: "company_name:desc" },
];

export function CustomerListView() {
  const dispatch = useAppDispatch();
  const { hasRole } = useAuth();
  const canManage = hasRole(...MANAGE_CUSTOMERS_ROLES);
  const { items, status, error, filters, page, totalPages } = useAppSelector((state) => state.customers);
  const [searchInput, setSearchInput] = useState(filters.search ?? "");

  useEffect(() => {
    const timeout = setTimeout(() => {
      dispatch(setFilters({ search: searchInput || undefined, page: 1 }));
    }, 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  useEffect(() => {
    dispatch(fetchCustomers(filters));
  }, [dispatch, filters]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Customers</h1>
          <p className="text-sm text-slate-500">Manage your customer accounts.</p>
        </div>
        {canManage && (
          <Link href="/customers/create">
            <Button>New customer</Button>
          </Link>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search by company, contact, or email"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          className="min-w-[260px] flex-1"
        />
        <Select
          options={STATUS_FILTER_OPTIONS}
          value={filters.status ?? ""}
          onChange={(event) =>
            dispatch(
              setFilters({ status: (event.target.value || undefined) as CustomerStatus | undefined, page: 1 })
            )
          }
          className="w-44"
        />
        <Select
          options={SORT_OPTIONS}
          value={`${filters.sort_by}:${filters.sort_order}`}
          onChange={(event) => {
            const [sort_by, sort_order] = event.target.value.split(":") as [CustomerSortField, SortOrder];
            dispatch(setFilters({ sort_by, sort_order }));
          }}
          className="w-44"
        />
      </div>

      {status === "loading" && items.length === 0 && <PageSpinner />}

      {status === "failed" && items.length === 0 && (
        <ErrorState message={error ?? undefined} onRetry={() => dispatch(fetchCustomers(filters))} />
      )}

      {status !== "loading" && status !== "failed" && items.length === 0 && (
        <EmptyState title="No customers found" description="Try adjusting your search or filters." />
      )}

      {items.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Company</th>
                <th className="px-4 py-2 font-medium">Contact</th>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((customer) => (
                <tr key={customer.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <Link href={`/customers/${customer.id}`} className="font-medium text-slate-900 hover:underline">
                      {customer.company_name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-slate-600">{customer.contact_name}</td>
                  <td className="px-4 py-2 text-slate-600">{customer.email}</td>
                  <td className="px-4 py-2">
                    <CustomerStatusBadge status={customer.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="secondary"
            disabled={page <= 1}
            onClick={() => dispatch(setFilters({ page: page - 1 }))}
          >
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
