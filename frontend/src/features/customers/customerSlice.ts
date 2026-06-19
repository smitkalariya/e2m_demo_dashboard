import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { extractErrorMessage } from "@/services/axios";
import { customerService } from "@/services/customer.service";
import type { Customer, CustomerListQuery } from "./types";

interface CustomerState {
  items: Customer[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  filters: CustomerListQuery;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

const initialState: CustomerState = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 20,
  totalPages: 0,
  filters: { page: 1, page_size: 20, sort_by: "created_at", sort_order: "desc" },
  status: "idle",
  error: null,
};

export const fetchCustomers = createAsyncThunk(
  "customers/fetchList",
  async (query: CustomerListQuery, { rejectWithValue }) => {
    try {
      return await customerService.list(query);
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, "Failed to load customers"));
    }
  }
);

const customerSlice = createSlice({
  name: "customers",
  initialState,
  reducers: {
    setFilters(state, action: PayloadAction<CustomerListQuery>) {
      state.filters = { ...state.filters, ...action.payload };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCustomers.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload.items;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.pageSize = action.payload.page_size;
        state.totalPages = action.payload.total_pages;
      })
      .addCase(fetchCustomers.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      });
  },
});

export const { setFilters } = customerSlice.actions;
export default customerSlice.reducer;
