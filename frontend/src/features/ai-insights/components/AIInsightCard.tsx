"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { extractErrorMessage } from "@/services/axios";
import { interactionService } from "@/services/interaction.service";
import { AIInsightStatusBadge } from "./AIInsightStatusBadge";
import type { AIInsight, Sentiment } from "../types";

const SENTIMENT_TONE: Record<Sentiment, "success" | "neutral" | "danger"> = {
  positive: "success",
  neutral: "neutral",
  negative: "danger",
};

interface AIInsightCardProps {
  interactionId: string;
  insight: AIInsight | null;
  canRegenerate: boolean;
  onRegenerated: (insight: AIInsight) => void;
}

export function AIInsightCard({ interactionId, insight, canRegenerate, onRegenerated }: AIInsightCardProps) {
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    setError(null);
    try {
      const updated = await interactionService.regenerateInsight(interactionId);
      onRegenerated(updated);
    } catch (err) {
      setError(extractErrorMessage(err, "Failed to regenerate AI insight"));
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900">AI Insight</h3>
        <div className="flex items-center gap-2">
          {insight && <AIInsightStatusBadge status={insight.status} />}
          {canRegenerate && (
            <Button variant="secondary" onClick={handleRegenerate} isLoading={isRegenerating}>
              Regenerate
            </Button>
          )}
        </div>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {!insight && <p className="mt-3 text-sm text-slate-500">No AI insight has been generated yet.</p>}

      {insight?.status === "pending" && (
        <p className="mt-3 text-sm text-slate-500">Insight generation is in progress.</p>
      )}

      {insight?.status === "failed" && (
        <p className="mt-3 text-sm text-red-600">{insight.error_message ?? "AI insight generation failed."}</p>
      )}

      {insight?.status === "completed" && (
        <div className="mt-4 flex flex-col gap-4">
          {insight.sentiment && (
            <div>
              <p className="text-xs font-medium uppercase text-slate-500">Sentiment</p>
              <Badge tone={SENTIMENT_TONE[insight.sentiment]}>{insight.sentiment}</Badge>
            </div>
          )}

          {insight.summary && (
            <div>
              <p className="text-xs font-medium uppercase text-slate-500">Summary</p>
              <p className="mt-1 text-sm text-slate-700">{insight.summary}</p>
            </div>
          )}

          {insight.action_items && insight.action_items.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase text-slate-500">Action items</p>
              <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">
                {insight.action_items.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {insight.risks && insight.risks.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase text-slate-500">Risks</p>
              <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">
                {insight.risks.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
