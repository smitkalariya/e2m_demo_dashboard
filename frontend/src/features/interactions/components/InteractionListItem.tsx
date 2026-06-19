import Link from "next/link";
import type { Interaction } from "../types";

function formatDate(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function InteractionListItem({ interaction }: { interaction: Interaction }) {
  return (
    <Link
      href={`/interactions/${interaction.id}`}
      className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 hover:border-slate-300 hover:bg-slate-50"
    >
      <div>
        <p className="font-medium text-slate-900">{interaction.title}</p>
        <p className="text-sm text-slate-500">{formatDate(interaction.meeting_date)}</p>
      </div>
    </Link>
  );
}
