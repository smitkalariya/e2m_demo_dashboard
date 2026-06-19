import Link from "next/link";
import { EmptyState } from "@/components/feedback/EmptyState";
import type { RecentInteraction } from "../types";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function RecentInteractionsTable({ interactions }: { interactions: RecentInteraction[] }) {
  if (interactions.length === 0) {
    return <EmptyState title="No recent interactions" description="Logged meetings will show up here." />;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-500">
          <tr>
            <th className="px-4 py-2 font-medium">Title</th>
            <th className="px-4 py-2 font-medium">Customer</th>
            <th className="px-4 py-2 font-medium">Meeting date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {interactions.map((interaction) => (
            <tr key={interaction.id} className="hover:bg-slate-50">
              <td className="px-4 py-2">
                <Link href={`/interactions/${interaction.id}`} className="font-medium text-slate-900 hover:underline">
                  {interaction.title}
                </Link>
              </td>
              <td className="px-4 py-2">
                <Link href={`/customers/${interaction.customer_id}`} className="text-slate-600 hover:underline">
                  {interaction.company_name}
                </Link>
              </td>
              <td className="px-4 py-2 text-slate-500">{formatDate(interaction.meeting_date)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
