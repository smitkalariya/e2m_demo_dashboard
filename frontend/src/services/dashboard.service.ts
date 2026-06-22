import { apiClient } from "@/services/axios";
import { IS_MOCK_MODE } from "@/lib/mock/config";
import { mockDashboardService } from "@/lib/mock/services/dashboard.mock.service";
import type { DashboardMetrics } from "@/features/dashboard/types";
import type { ApiSuccessResponse } from "@/types/api";

const realDashboardService = {
  async getMetrics(): Promise<DashboardMetrics> {
    const { data } = await apiClient.get<ApiSuccessResponse<DashboardMetrics>>("/dashboard/metrics");
    return data.data;
  },
};

// Swapped wholesale based on NEXT_PUBLIC_USE_MOCK_API — every caller imports
// `dashboardService` from this module, so flipping the flag (and removing
// this branch later) needs no changes anywhere else in the app.
export const dashboardService = IS_MOCK_MODE ? mockDashboardService : realDashboardService;
