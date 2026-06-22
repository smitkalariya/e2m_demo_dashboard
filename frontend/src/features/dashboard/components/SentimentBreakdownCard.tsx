"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { SentimentBreakdown } from "../types";

const SENTIMENT_META: { key: keyof SentimentBreakdown; label: string; color: string }[] = [
  { key: "positive", label: "Positive", color: "#10b981" },
  { key: "neutral", label: "Neutral", color: "#94a3b8" },
  { key: "negative", label: "Negative", color: "#ef4444" },
];

export function SentimentBreakdownCard({ breakdown }: { breakdown: SentimentBreakdown }) {
  const total = breakdown.positive + breakdown.neutral + breakdown.negative;
  const chartData = SENTIMENT_META.map(({ key, label, color }) => ({
    name: label,
    count: breakdown[key] ?? 0,
    color,
  }));

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">Sentiment breakdown</p>

      {total === 0 ? (
        <p className="mt-4 text-sm text-slate-400">No interactions with AI insights yet.</p>
      ) : (
        <div className="mt-4 h-56 w-full" role="img" aria-label="Sentiment breakdown bar chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: "#f1f5f9" }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-600">
        {SENTIMENT_META.map(({ key, label, color }) => (
          <span key={key} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
            {label}: {breakdown[key] ?? 0}
          </span>
        ))}
      </div>
    </div>
  );
}
