import { apiClient } from "@/services/axios";
import type {
  Interaction,
  InteractionCreatePayload,
  InteractionDetail,
  InteractionListQuery,
  InteractionUpdatePayload,
} from "@/features/interactions/types";
import type { AIInsight } from "@/features/ai-insights/types";
import type { ApiSuccessResponse, PaginatedResponse } from "@/types/api";

export const interactionService = {
  async list(query: InteractionListQuery): Promise<PaginatedResponse<Interaction>> {
    const { data } = await apiClient.get<ApiSuccessResponse<PaginatedResponse<Interaction>>>("/interactions", {
      params: query,
    });
    return data.data;
  },

  async get(id: string): Promise<InteractionDetail> {
    const { data } = await apiClient.get<ApiSuccessResponse<InteractionDetail>>(`/interactions/${id}`);
    return data.data;
  },

  async create(customerId: string, payload: InteractionCreatePayload): Promise<Interaction> {
    const { data } = await apiClient.post<ApiSuccessResponse<Interaction>>(
      `/customers/${customerId}/interactions`,
      payload
    );
    return data.data;
  },

  async update(id: string, payload: InteractionUpdatePayload): Promise<Interaction> {
    const { data } = await apiClient.patch<ApiSuccessResponse<Interaction>>(`/interactions/${id}`, payload);
    return data.data;
  },

  async regenerateInsight(id: string): Promise<AIInsight> {
    const { data } = await apiClient.post<ApiSuccessResponse<AIInsight>>(`/interactions/${id}/insights/regenerate`);
    return data.data;
  },
};
