import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { extractErrorMessage } from "@/services/axios";
import { interactionService } from "@/services/interaction.service";
import type { Interaction, InteractionListQuery } from "./types";

interface InteractionState {
  items: Interaction[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  filters: InteractionListQuery;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

const initialState: InteractionState = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 20,
  totalPages: 0,
  filters: { page: 1, page_size: 20, sort_by: "meeting_date", sort_order: "desc" },
  status: "idle",
  error: null,
};

export const fetchInteractions = createAsyncThunk(
  "interactions/fetchList",
  async (query: InteractionListQuery, { rejectWithValue }) => {
    try {
      return await interactionService.list(query);
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, "Failed to load interactions"));
    }
  }
);

const interactionSlice = createSlice({
  name: "interactions",
  initialState,
  reducers: {
    setFilters(state, action: PayloadAction<InteractionListQuery>) {
      state.filters = { ...state.filters, ...action.payload };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInteractions.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchInteractions.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload.items;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.pageSize = action.payload.page_size;
        state.totalPages = action.payload.total_pages;
      })
      .addCase(fetchInteractions.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      });
  },
});

export const { setFilters } = interactionSlice.actions;
export default interactionSlice.reducer;
