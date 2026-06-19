"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchInteractions, setFilters } from "../interactionSlice";
import { PageSpinner } from "@/components/feedback/Spinner";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Button } from "@/components/ui/Button";

function formatDate(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function InteractionListView() {
  const dispatch = useAppDispatch();
  const { items, status, error, filters, page, totalPages } = useAppSelector((state) => state.interactions);

  useEffect(() => {
    dispatch(fetchInteractions(filters));
  }, [dispatch, filters]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Interactions</h1>
        <p className="text-sm text-slate-500">All logged customer meetings, most recent first.</p>
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
                <p className="text-sm text-slate-500">{formatDate(interaction.meeting_date)}</p>
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
