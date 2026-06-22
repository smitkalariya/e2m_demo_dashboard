"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { interactionService } from "@/services/interaction.service";
import { extractErrorMessage } from "@/services/axios";
import { useAuth } from "@/hooks/useAuth";
import { TRIGGER_AI_INSIGHT_ROLES } from "@/constants/roles";
import { PageSpinner } from "@/components/feedback/Spinner";
import { ErrorState } from "@/components/feedback/ErrorState";
import { Button } from "@/components/ui/Button";
import { AIInsightCard } from "@/features/ai-insights/components/AIInsightCard";
import { formatDateTime } from "@/utils/date";
import { InteractionEditForm } from "./InteractionEditForm";
import type { InteractionDetail } from "../types";

export function InteractionDetailView({ interactionId }: { interactionId: string }) {
  const { hasRole } = useAuth();
  const canRegenerate = hasRole(...TRIGGER_AI_INSIGHT_ROLES);

  const [interaction, setInteraction] = useState<InteractionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const load = useCallback(() => {
    interactionService
      .get(interactionId)
      .then((data) => {
        setInteraction(data);
        setError(null);
      })
      .catch((err) => setError(extractErrorMessage(err, "Failed to load interaction")))
      .finally(() => setIsLoading(false));
  }, [interactionId]);

  useEffect(() => {
    load();
  }, [load]);

  if (isLoading) return <PageSpinner />;
  if (error || !interaction) return <ErrorState message={error ?? undefined} onRetry={load} />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{interaction.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{formatDateTime(interaction.meeting_date)}</p>
          <Link href={`/customers/${interaction.customer_id}`} className="mt-1 inline-block text-sm text-slate-600 hover:underline">
            View customer
          </Link>
        </div>
        {!isEditing && <Button variant="secondary" onClick={() => setIsEditing(true)}>Edit</Button>}
      </div>

      {isEditing ? (
        <InteractionEditForm
          interaction={interaction}
          onSaved={(updated) => {
            setInteraction({ ...interaction, ...updated });
            setIsEditing(false);
          }}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium uppercase text-slate-500">Notes</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{interaction.notes}</p>
        </div>
      )}

      <AIInsightCard
        interactionId={interaction.id}
        insight={interaction.ai_insight}
        canRegenerate={canRegenerate}
        onRegenerated={(insight) => setInteraction({ ...interaction, ai_insight: insight })}
      />
    </div>
  );
}
