import { render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { CustomerListView } from "@/features/customers/components/CustomerListView";
import customerReducer from "@/features/customers/customerSlice";
import authReducer from "@/features/auth/authSlice";
import { customerService } from "@/services/customer.service";
import type { Customer } from "@/features/customers/types";
import type { User, UserRole } from "@/features/auth/types";
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

const listResponse: PaginatedResponse<Customer> = {
  items: [customer],
  total: 1,
  page: 1,
  page_size: 20,
  total_pages: 1,
};

function buildUser(role: UserRole): User {
  return {
    id: "u1",
    name: "Test User",
    email: "user@example.com",
    role,
    is_active: true,
    created_at: "2026-01-01T00:00:00.000Z",
  };
}

function renderWithRole(role: UserRole) {
  const store = configureStore({ reducer: { customers: customerReducer, auth: authReducer } });
  store.dispatch({ type: "auth/login/fulfilled", payload: buildUser(role) });

  render(
    <Provider store={store}>
      <CustomerListView />
    </Provider>
  );
  return store;
}

describe("CustomerListView RBAC", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedCustomerService.list.mockResolvedValue(listResponse);
  });

  it("shows the New customer button for an admin", async () => {
    renderWithRole("admin");
    await waitFor(() => expect(mockedCustomerService.list).toHaveBeenCalled());
    expect(await screen.findByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /new customer/i })).toBeInTheDocument();
  });

  it("shows the New customer button for a manager", async () => {
    renderWithRole("manager");
    await waitFor(() => expect(mockedCustomerService.list).toHaveBeenCalled());
    await screen.findByText("Acme Corp");
    expect(screen.getByRole("link", { name: /new customer/i })).toBeInTheDocument();
  });

  it("hides the New customer button for a plain user", async () => {
    renderWithRole("user");
    await waitFor(() => expect(mockedCustomerService.list).toHaveBeenCalled());
    await screen.findByText("Acme Corp");
    expect(screen.queryByRole("link", { name: /new customer/i })).not.toBeInTheDocument();
  });

  it("calls customerService.list (not raw axios) to load the customers", async () => {
    renderWithRole("admin");
    await waitFor(() => expect(mockedCustomerService.list).toHaveBeenCalledTimes(1));
    expect(mockedCustomerService.list).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, page_size: 20 })
    );
  });
});
