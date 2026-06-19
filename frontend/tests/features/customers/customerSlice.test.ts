import { configureStore } from "@reduxjs/toolkit";
import customerReducer, { fetchCustomers, setFilters } from "@/features/customers/customerSlice";
import { customerService } from "@/services/customer.service";
import type { Customer } from "@/features/customers/types";
import type { PaginatedResponse } from "@/types/api";

jest.mock("@/services/customer.service", () => ({
  customerService: {
    list: jest.fn(),
  },
}));

const mockedCustomerService = customerService as jest.Mocked<typeof customerService>;

const customer: Customer = {
  id: "c1",
  company_name: "Acme Corp",
  contact_name: "Wile Coyote",
  email: "wile@acme.test",
  phone: null,
  status: "active",
  created_by_id: "u1",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const page1Response: PaginatedResponse<Customer> = {
  items: [customer],
  total: 1,
  page: 1,
  page_size: 20,
  total_pages: 1,
};

function configureTestStore() {
  return configureStore({ reducer: { customers: customerReducer } });
}

const initialState = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 20,
  totalPages: 0,
  filters: { page: 1, page_size: 20, sort_by: "created_at" as const, sort_order: "desc" as const },
  status: "idle" as const,
  error: null,
};

describe("customerSlice reducer", () => {
  it("returns the initial state", () => {
    expect(customerReducer(undefined, { type: "unknown" })).toEqual(initialState);
  });

  it("setFilters merges new filters into existing filters", () => {
    const state = customerReducer(initialState, setFilters({ search: "acme", page: 2 }));
    expect(state.filters).toEqual({ ...initialState.filters, search: "acme", page: 2 });
  });

  it("setFilters does not clear filters that are not provided", () => {
    const withSearch = customerReducer(initialState, setFilters({ search: "acme" }));
    const withStatus = customerReducer(withSearch, setFilters({ status: "active" }));
    expect(withStatus.filters.search).toBe("acme");
    expect(withStatus.filters.status).toBe("active");
  });

  it("sets loading status and clears error on fetchCustomers.pending", () => {
    const state = customerReducer(
      { ...initialState, error: "old error" },
      { type: fetchCustomers.pending.type }
    );
    expect(state.status).toBe("loading");
    expect(state.error).toBeNull();
  });

  it("stores list, pagination data on fetchCustomers.fulfilled", () => {
    const state = customerReducer(initialState, {
      type: fetchCustomers.fulfilled.type,
      payload: page1Response,
    });
    expect(state.status).toBe("succeeded");
    expect(state.items).toEqual([customer]);
    expect(state.total).toBe(1);
    expect(state.page).toBe(1);
    expect(state.pageSize).toBe(20);
    expect(state.totalPages).toBe(1);
  });

  it("stores the error message on fetchCustomers.rejected", () => {
    const state = customerReducer(initialState, {
      type: fetchCustomers.rejected.type,
      payload: "Failed to load customers",
    });
    expect(state.status).toBe("failed");
    expect(state.error).toBe("Failed to load customers");
  });
});

describe("customerSlice async thunk", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("fetchCustomers() calls customerService.list with the query and stores the result", async () => {
    mockedCustomerService.list.mockResolvedValueOnce(page1Response);
    const store = configureTestStore();
    const query = { page: 1, page_size: 20, sort_by: "created_at" as const, sort_order: "desc" as const };

    await store.dispatch(fetchCustomers(query));

    expect(mockedCustomerService.list).toHaveBeenCalledWith(query);
    expect(store.getState().customers.items).toEqual([customer]);
    expect(store.getState().customers.status).toBe("succeeded");
  });

  it("fetchCustomers() extracts the API error message on failure", async () => {
    mockedCustomerService.list.mockRejectedValueOnce({
      isAxiosError: true,
      response: { data: { message: "Customers service down" } },
    });
    const store = configureTestStore();

    await store.dispatch(fetchCustomers({ page: 1, page_size: 20 }));

    expect(store.getState().customers.status).toBe("failed");
    expect(store.getState().customers.error).toBe("Customers service down");
  });
});
