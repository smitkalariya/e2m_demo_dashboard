import Link from "next/link";
import { formatDateTime } from "@/utils/date";
import type { Interaction } from "../types";

export function InteractionListItem({ interaction }: { interaction: Interaction }) {
  return (
    <Link
      href={`/interactions/${interaction.id}`}
      className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 hover:border-slate-300 hover:bg-slate-50"
    >
      <div>
        <p className="font-medium text-slate-900">{interaction.title}</p>
        <p className="text-sm text-slate-500">{formatDateTime(interaction.meeting_date)}</p>
      </div>
    </Link>
  );
}
