import type { AIInsight } from "@/features/ai-insights/types";

export interface Interaction {
  id: string;
  customer_id: string;
  title: string;
  notes: string;
  meeting_date: string;
  created_by_id: string;
  created_at: string;
  updated_at: string;
}

export interface InteractionDetail extends Interaction {
  ai_insight: AIInsight | null;
}

export interface InteractionCreatePayload {
  title: string;
  notes: string;
  meeting_date: string;
}

export type InteractionUpdatePayload = Partial<InteractionCreatePayload>;

export type InteractionSortField = "meeting_date" | "created_at";
export type SortOrder = "asc" | "desc";

export interface InteractionListQuery {
  customer_id?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
  sort_by?: InteractionSortField;
  sort_order?: SortOrder;
}
