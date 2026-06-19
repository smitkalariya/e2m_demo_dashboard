import { configureStore } from "@reduxjs/toolkit";
import dashboardReducer, { fetchDashboardMetrics } from "@/features/dashboard/dashboardSlice";
import { dashboardService } from "@/services/dashboard.service";
import type { DashboardMetrics } from "@/features/dashboard/types";

jest.mock("@/services/dashboard.service", () => ({
  dashboardService: {
    getMetrics: jest.fn(),
  },
}));

const mockedDashboardService = dashboardService as jest.Mocked<typeof dashboardService>;

const metrics: DashboardMetrics = {
  total_customers: 12,
  total_interactions: 34,
  sentiment_breakdown: { positive: 10, neutral: 5, negative: 2 },
  recent_interactions: [
    {
      id: "i1",
      title: "Quarterly review",
      customer_id: "c1",
      company_name: "Acme Corp",
      meeting_date: "2026-01-01T00:00:00.000Z",
    },
  ],
};

function configureTestStore() {
  return configureStore({ reducer: { dashboard: dashboardReducer } });
}

describe("dashboardSlice reducer", () => {
  const initialState = { metrics: null, status: "idle" as const, error: null };

  it("returns the initial state", () => {
    expect(dashboardReducer(undefined, { type: "unknown" })).toEqual(initialState);
  });

  it("sets loading status and clears error on fetchDashboardMetrics.pending", () => {
    const state = dashboardReducer(
      { ...initialState, error: "old error" },
      { type: fetchDashboardMetrics.pending.type }
    );
    expect(state.status).toBe("loading");
    expect(state.error).toBeNull();
  });

  it("stores metrics on fetchDashboardMetrics.fulfilled", () => {
    const state = dashboardReducer(initialState, {
      type: fetchDashboardMetrics.fulfilled.type,
      payload: metrics,
    });
    expect(state.status).toBe("succeeded");
    expect(state.metrics).toEqual(metrics);
  });

  it("stores the error message on fetchDashboardMetrics.rejected", () => {
    const state = dashboardReducer(initialState, {
      type: fetchDashboardMetrics.rejected.type,
      payload: "Failed to load dashboard metrics",
    });
    expect(state.status).toBe("failed");
    expect(state.error).toBe("Failed to load dashboard metrics");
  });
});

describe("dashboardSlice async thunk", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("fetchDashboardMetrics() calls dashboardService.getMetrics and stores the result", async () => {
    mockedDashboardService.getMetrics.mockResolvedValueOnce(metrics);
    const store = configureTestStore();

    await store.dispatch(fetchDashboardMetrics());

    expect(mockedDashboardService.getMetrics).toHaveBeenCalledTimes(1);
    expect(store.getState().dashboard.metrics).toEqual(metrics);
    expect(store.getState().dashboard.status).toBe("succeeded");
  });

  it("fetchDashboardMetrics() extracts the API error message on failure", async () => {
    mockedDashboardService.getMetrics.mockRejectedValueOnce({
      isAxiosError: true,
      response: { data: { message: "Metrics service unavailable" } },
    });
    const store = configureTestStore();

    await store.dispatch(fetchDashboardMetrics());

    expect(store.getState().dashboard.status).toBe("failed");
    expect(store.getState().dashboard.error).toBe("Metrics service unavailable");
  });
});
