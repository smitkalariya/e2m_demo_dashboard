import { Badge } from "@/components/ui/Badge";
import type { AIInsightStatus } from "../types";

const STATUS_TONE: Record<AIInsightStatus, "neutral" | "success" | "danger"> = {
  pending: "neutral",
  completed: "success",
  failed: "danger",
};

const STATUS_LABEL: Record<AIInsightStatus, string> = {
  pending: "Generating insight",
  completed: "Insight ready",
  failed: "Insight failed",
};

export function AIInsightStatusBadge({ status }: { status: AIInsightStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>;
}
