export interface RecentInteraction {
  id: string;
  title: string;
  customer_id: string;
  company_name: string;
  meeting_date: string;
}

export interface SentimentBreakdown {
  positive: number;
  neutral: number;
  negative: number;
}

export interface DashboardMetrics {
  total_customers: number;
  total_interactions: number;
  sentiment_breakdown: SentimentBreakdown;
  recent_interactions: RecentInteraction[];
}
