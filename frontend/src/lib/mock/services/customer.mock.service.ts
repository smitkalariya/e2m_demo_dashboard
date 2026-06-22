import type { Customer, CustomerCreatePayload, CustomerListQuery, CustomerUpdatePayload } from "@/features/customers/types";
import type { PaginatedResponse } from "@/types/api";
import { delay } from "../utils";
import * as store from "../store";

class MockNotFoundError extends Error {}

export const mockCustomerService = {
  async list(query: CustomerListQuery): Promise<PaginatedResponse<Customer>> {
    await delay();
    return store.listCustomers(query);
  },

  async get(id: string): Promise<Customer> {
    await delay();
    const customer = store.getCustomer(id);
    if (!customer) throw new MockNotFoundError("Customer not found");
    return customer;
  },

  async create(payload: CustomerCreatePayload): Promise<Customer> {
    await delay();
    return store.createCustomer({
      company_name: payload.company_name,
      contact_name: payload.contact_name,
      email: payload.email,
      phone: payload.phone ?? null,
      status: payload.status ?? "prospect",
    });
  },

  async update(id: string, payload: CustomerUpdatePayload): Promise<Customer> {
    await delay();
    return store.updateCustomer(id, payload);
  },

  async remove(id: string): Promise<void> {
    await delay();
    store.deleteCustomer(id);
  },
};
