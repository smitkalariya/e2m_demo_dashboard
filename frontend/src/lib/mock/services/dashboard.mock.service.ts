import type { DashboardMetrics } from "@/features/dashboard/types";
import { delay } from "../utils";
import * as store from "../store";

export const mockDashboardService = {
  async getMetrics(): Promise<DashboardMetrics> {
    await delay();
    return store.getDashboardMetrics();
  },
};
