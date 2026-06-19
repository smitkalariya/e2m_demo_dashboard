import { Badge } from "@/components/ui/Badge";
import type { CustomerStatus } from "../types";

const STATUS_TONE: Record<CustomerStatus, "neutral" | "success" | "warning" | "danger"> = {
  prospect: "neutral",
  active: "success",
  inactive: "warning",
  churned: "danger",
};

const STATUS_LABEL: Record<CustomerStatus, string> = {
  prospect: "Prospect",
  active: "Active",
  inactive: "Inactive",
  churned: "Churned",
};

export function CustomerStatusBadge({ status }: { status: CustomerStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>;
}
