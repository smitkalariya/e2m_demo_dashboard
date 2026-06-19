import { configureStore } from "@reduxjs/toolkit";
import interactionReducer, {
  fetchInteractions,
  setFilters,
} from "@/features/interactions/interactionSlice";
import { interactionService } from "@/services/interaction.service";
import type { Interaction } from "@/features/interactions/types";
import type { PaginatedResponse } from "@/types/api";

jest.mock("@/services/interaction.service", () => ({
  interactionService: {
    list: jest.fn(),
  },
}));

const mockedInteractionService = interactionService as jest.Mocked<typeof interactionService>;

const interaction: Interaction = {
  id: "i1",
  customer_id: "c1",
  title: "Kickoff call",
  notes: "Discussed onboarding plan.",
  meeting_date: "2026-01-05T00:00:00.000Z",
  created_by_id: "u1",
  created_at: "2026-01-05T00:00:00.000Z",
  updated_at: "2026-01-05T00:00:00.000Z",
};

const page1Response: PaginatedResponse<Interaction> = {
  items: [interaction],
  total: 1,
  page: 1,
  page_size: 20,
  total_pages: 1,
};

function configureTestStore() {
  return configureStore({ reducer: { interactions: interactionReducer } });
}

const initialState = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 20,
  totalPages: 0,
  filters: { page: 1, page_size: 20, sort_by: "meeting_date" as const, sort_order: "desc" as const },
  status: "idle" as const,
  error: null,
};

describe("interactionSlice reducer", () => {
  it("returns the initial state", () => {
    expect(interactionReducer(undefined, { type: "unknown" })).toEqual(initialState);
  });

  it("setFilters merges new filters into existing filters", () => {
    const state = interactionReducer(initialState, setFilters({ customer_id: "c1", page: 3 }));
    expect(state.filters).toEqual({ ...initialState.filters, customer_id: "c1", page: 3 });
  });

  it("sets loading status and clears error on fetchInteractions.pending", () => {
    const state = interactionReducer(
      { ...initialState, error: "old error" },
      { type: fetchInteractions.pending.type }
    );
    expect(state.status).toBe("loading");
    expect(state.error).toBeNull();
  });

  it("stores list and pagination data on fetchInteractions.fulfilled", () => {
    const state = interactionReducer(initialState, {
      type: fetchInteractions.fulfilled.type,
      payload: page1Response,
    });
    expect(state.status).toBe("succeeded");
    expect(state.items).toEqual([interaction]);
    expect(state.total).toBe(1);
    expect(state.totalPages).toBe(1);
  });

  it("stores the error message on fetchInteractions.rejected", () => {
    const state = interactionReducer(initialState, {
      type: fetchInteractions.rejected.type,
      payload: "Failed to load interactions",
    });
    expect(state.status).toBe("failed");
    expect(state.error).toBe("Failed to load interactions");
  });
});

describe("interactionSlice async thunk", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("fetchInteractions() calls interactionService.list with the query and stores the result", async () => {
    mockedInteractionService.list.mockResolvedValueOnce(page1Response);
    const store = configureTestStore();
    const query = { customer_id: "c1", page: 1, page_size: 20 };

    await store.dispatch(fetchInteractions(query));

    expect(mockedInteractionService.list).toHaveBeenCalledWith(query);
    expect(store.getState().interactions.items).toEqual([interaction]);
    expect(store.getState().interactions.status).toBe("succeeded");
  });

  it("fetchInteractions() extracts the API error message on failure", async () => {
    mockedInteractionService.list.mockRejectedValueOnce({
      isAxiosError: true,
      response: { data: { message: "Interactions service down" } },
    });
    const store = configureTestStore();

    await store.dispatch(fetchInteractions({ page: 1, page_size: 20 }));

    expect(store.getState().interactions.status).toBe("failed");
    expect(store.getState().interactions.error).toBe("Interactions service down");
  });
});
