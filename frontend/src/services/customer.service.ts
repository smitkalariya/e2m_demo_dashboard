import { apiClient } from "@/services/axios";
import { IS_MOCK_MODE } from "@/lib/mock/config";
import { mockCustomerService } from "@/lib/mock/services/customer.mock.service";
import type {
  Customer,
  CustomerCreatePayload,
  CustomerListQuery,
  CustomerUpdatePayload,
} from "@/features/customers/types";
import type { ApiSuccessResponse, PaginatedResponse } from "@/types/api";

const realCustomerService = {
  async list(query: CustomerListQuery): Promise<PaginatedResponse<Customer>> {
    const { data } = await apiClient.get<ApiSuccessResponse<PaginatedResponse<Customer>>>("/customers", {
      params: query,
    });
    return data.data;
  },

  async get(id: string): Promise<Customer> {
    const { data } = await apiClient.get<ApiSuccessResponse<Customer>>(`/customers/${id}`);
    return data.data;
  },

  async create(payload: CustomerCreatePayload): Promise<Customer> {
    const { data } = await apiClient.post<ApiSuccessResponse<Customer>>("/customers", payload);
    return data.data;
  },

  async update(id: string, payload: CustomerUpdatePayload): Promise<Customer> {
    const { data } = await apiClient.patch<ApiSuccessResponse<Customer>>(`/customers/${id}`, payload);
    return data.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/customers/${id}`);
  },
};

// Swapped wholesale based on NEXT_PUBLIC_USE_MOCK_API — every caller imports
// `customerService` from this module, so flipping the flag (and removing this
// branch later) needs no changes anywhere else in the app.
export const customerService = IS_MOCK_MODE ? mockCustomerService : realCustomerService;
