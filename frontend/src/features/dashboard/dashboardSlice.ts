import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { extractErrorMessage } from "@/services/axios";
import { dashboardService } from "@/services/dashboard.service";
import type { DashboardMetrics } from "./types";

interface DashboardState {
  metrics: DashboardMetrics | null;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

const initialState: DashboardState = {
  metrics: null,
  status: "idle",
  error: null,
};

export const fetchDashboardMetrics = createAsyncThunk(
  "dashboard/fetchMetrics",
  async (_: void, { rejectWithValue }) => {
    try {
      return await dashboardService.getMetrics();
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, "Failed to load dashboard metrics"));
    }
  }
);

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardMetrics.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchDashboardMetrics.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.metrics = action.payload;
      })
      .addCase(fetchDashboardMetrics.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      });
  },
});

export default dashboardSlice.reducer;
