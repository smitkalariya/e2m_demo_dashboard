import type { SentimentBreakdown } from "../types";

const SENTIMENT_META: { key: keyof SentimentBreakdown; label: string; barClass: string }[] = [
  { key: "positive", label: "Positive", barClass: "bg-emerald-500" },
  { key: "neutral", label: "Neutral", barClass: "bg-slate-400" },
  { key: "negative", label: "Negative", barClass: "bg-red-500" },
];

export function SentimentBreakdownCard({ breakdown }: { breakdown: SentimentBreakdown }) {
  const total = breakdown.positive + breakdown.neutral + breakdown.negative;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">Sentiment breakdown</p>
      <div className="mt-4 flex flex-col gap-3">
        {SENTIMENT_META.map(({ key, label, barClass }) => {
          const count = breakdown[key] ?? 0;
          const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={key}>
              <div className="flex justify-between text-sm text-slate-600">
                <span>{label}</span>
                <span>{count}</span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full ${barClass}`} style={{ width: `${percentage}%` }} />
              </div>
            </div>
          );
        })}
        {total === 0 && <p className="text-sm text-slate-400">No interactions with AI insights yet.</p>}
      </div>
    </div>
  );
}
