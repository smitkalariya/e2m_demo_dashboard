import { apiClient } from "@/services/axios";
import type { DashboardMetrics } from "@/features/dashboard/types";
import type { ApiSuccessResponse } from "@/types/api";

export const dashboardService = {
  async getMetrics(): Promise<DashboardMetrics> {
    const { data } = await apiClient.get<ApiSuccessResponse<DashboardMetrics>>("/dashboard/metrics");
    return data.data;
  },
};
