"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { SentimentBreakdown } from "../types";

const SENTIMENT_META: { key: keyof SentimentBreakdown; label: string; color: string; borderColor: string }[] = [
  { key: "positive", label: "Positive", color: "#10b981", borderColor: "#047857" },
  { key: "neutral", label: "Neutral", color: "#94a3b8", borderColor: "#475569" },
  { key: "negative", label: "Negative", color: "#ef4444", borderColor: "#b91c1c" },
];

export function SentimentBreakdownCard({ breakdown }: { breakdown: SentimentBreakdown }) {
  const total = breakdown.positive + breakdown.neutral + breakdown.negative;
  const chartData = SENTIMENT_META.map(({ key, label, color, borderColor }) => ({
    name: label,
    count: breakdown[key] ?? 0,
    color,
    borderColor,
  }));

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">Sentiment breakdown</p>
      <p className="mt-1 text-sm text-slate-400">
        Distribution of AI-detected sentiment across all logged customer interactions.
      </p>

      {total === 0 ? (
        <p className="mt-4 text-sm text-slate-400">No interactions with AI insights yet.</p>
      ) : (
        <>
          <ul className="mt-3 flex flex-wrap justify-center gap-4 text-sm text-slate-600">
            {SENTIMENT_META.map(({ key, label, color, borderColor }) => (
              <li key={key} className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm border" style={{ backgroundColor: color, borderColor }} />
                {label}: {breakdown[key] ?? 0}
              </li>
            ))}
          </ul>

          <div className="mt-2 h-64 w-full" role="img" aria-label="Sentiment breakdown bar chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 16, left: -8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  axisLine={{ stroke: "#cbd5e1" }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  axisLine={{ stroke: "#cbd5e1" }}
                  tickLine={false}
                />
                <Tooltip cursor={{ fill: "#f1f5f9" }} />
                <Bar dataKey="count" radius={[0, 0, 0, 0]}>
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} stroke={entry.borderColor} strokeWidth={2} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
