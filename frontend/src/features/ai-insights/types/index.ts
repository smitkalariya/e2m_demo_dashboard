export type AIInsightStatus = "pending" | "completed" | "failed";
export type Sentiment = "positive" | "neutral" | "negative";

export interface AIInsight {
  id: string;
  interaction_id: string;
  status: AIInsightStatus;
  summary: string | null;
  sentiment: Sentiment | null;
  action_items: string[] | null;
  risks: string[] | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}
