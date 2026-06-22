import type {
  Interaction,
  InteractionCreatePayload,
  InteractionDetail,
  InteractionListQuery,
  InteractionUpdatePayload,
} from "@/features/interactions/types";
import type { AIInsight } from "@/features/ai-insights/types";
import type { PaginatedResponse } from "@/types/api";
import { delay } from "../utils";
import * as store from "../store";

class MockNotFoundError extends Error {}

export const mockInteractionService = {
  async list(query: InteractionListQuery): Promise<PaginatedResponse<Interaction>> {
    await delay();
    return store.listInteractions(query);
  },

  async get(id: string): Promise<InteractionDetail> {
    await delay();
    const interaction = store.getInteraction(id);
    if (!interaction) throw new MockNotFoundError("Interaction not found");
    return { ...interaction, ai_insight: store.getInsight(id) };
  },

  async create(customerId: string, payload: InteractionCreatePayload): Promise<Interaction> {
    await delay();
    return store.createInteraction(customerId, payload);
  },

  async update(id: string, payload: InteractionUpdatePayload): Promise<Interaction> {
    await delay();
    return store.updateInteraction(id, payload);
  },

  async regenerateInsight(id: string): Promise<AIInsight> {
    await delay(600);
    return store.regenerateInsight(id);
  },
};
