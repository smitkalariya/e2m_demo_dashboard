import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { InteractionListView } from "@/features/interactions/components/InteractionListView";
import interactionReducer from "@/features/interactions/interactionSlice";
import { interactionService } from "@/services/interaction.service";
import { customerService } from "@/services/customer.service";
import type { Interaction } from "@/features/interactions/types";
import type { Customer } from "@/features/customers/types";
import type { PaginatedResponse } from "@/types/api";

jest.mock("@/services/interaction.service", () => ({
  interactionService: { list: jest.fn() },
}));
jest.mock("@/services/customer.service", () => ({
  customerService: { list: jest.fn() },
}));

const mockedInteractionService = interactionService as jest.Mocked<typeof interactionService>;
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

const interaction: Interaction = {
  id: "i1",
  customer_id: "c1",
  title: "Kickoff call",
  notes: "Discussed onboarding plan.",
  meeting_date: "2026-01-02T10:00:00.000Z",
  created_by_id: "u1",
  created_at: "2026-01-02T10:00:00.000Z",
  updated_at: "2026-01-02T10:00:00.000Z",
};

const interactionListResponse: PaginatedResponse<Interaction> = {
  items: [interaction],
  total: 1,
  page: 1,
  page_size: 20,
  total_pages: 1,
};

const customerListResponse: PaginatedResponse<Customer> = {
  items: [customer],
  total: 1,
  page: 1,
  page_size: 100,
  total_pages: 1,
};

function renderView() {
  const store = configureStore({ reducer: { interactions: interactionReducer } });
  render(
    <Provider store={store}>
      <InteractionListView />
    </Provider>
  );
}

describe("InteractionListView filters", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedInteractionService.list.mockResolvedValue(interactionListResponse);
    mockedCustomerService.list.mockResolvedValue(customerListResponse);
  });

  it("loads the customer options for the filter dropdown", async () => {
    renderView();
    await waitFor(() => expect(mockedCustomerService.list).toHaveBeenCalled());
    expect(await screen.findByText("Kickoff call")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Acme Corp" })).toBeInTheDocument();
  });

  it("re-fetches interactions filtered by the selected customer", async () => {
    renderView();
    await screen.findByText("Kickoff call");

    await userEvent.selectOptions(screen.getByLabelText("Filter by customer"), "c1");

    await waitFor(() =>
      expect(mockedInteractionService.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ customer_id: "c1", page: 1 })
      )
    );
  });

  it("re-fetches interactions filtered by date range", async () => {
    renderView();
    await screen.findByText("Kickoff call");

    await userEvent.type(screen.getByLabelText("From date"), "2026-01-01");

    await waitFor(() =>
      expect(mockedInteractionService.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ date_from: "2026-01-01", page: 1 })
      )
    );
  });
});
