"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchDashboardMetrics } from "../dashboardSlice";
import { MetricCard } from "@/components/cards/MetricCard";
import { PageSpinner } from "@/components/feedback/Spinner";
import { ErrorState } from "@/components/feedback/ErrorState";
import { SentimentBreakdownCard } from "./SentimentBreakdownCard";
import { RecentInteractionsTable } from "./RecentInteractionsTable";

export function DashboardView() {
  const dispatch = useAppDispatch();
  const { metrics, status, error } = useAppSelector((state) => state.dashboard);

  useEffect(() => {
    dispatch(fetchDashboardMetrics());
  }, [dispatch]);

  if (status === "loading" && !metrics) {
    return <PageSpinner />;
  }

  if (status === "failed" && !metrics) {
    return <ErrorState message={error ?? undefined} onRetry={() => dispatch(fetchDashboardMetrics())} />;
  }

  if (!metrics) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">A snapshot of your customer success activity.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <MetricCard label="Total customers" value={metrics.total_customers} />
        <MetricCard label="Total interactions" value={metrics.total_interactions} />
      </div>

      <SentimentBreakdownCard breakdown={metrics.sentiment_breakdown} />

      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Recent interactions</h2>
        <RecentInteractionsTable interactions={metrics.recent_interactions} />
      </div>
    </div>
  );
}
