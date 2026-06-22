import { apiClient } from "@/services/axios";
import { IS_MOCK_MODE } from "@/lib/mock/config";
import { mockAuthService } from "@/lib/mock/services/auth.mock.service";
import type { LoginPayload, RegisterPayload, User } from "@/features/auth/types";
import type { ApiSuccessResponse } from "@/types/api";

const realAuthService = {
  async login(payload: LoginPayload): Promise<User> {
    const { data } = await apiClient.post<ApiSuccessResponse<User>>("/auth/login", payload);
    return data.data;
  },

  async register(payload: RegisterPayload): Promise<User> {
    const { data } = await apiClient.post<ApiSuccessResponse<User>>("/auth/register", payload);
    return data.data;
  },

  async logout(): Promise<void> {
    await apiClient.post("/auth/logout");
  },

  async profile(): Promise<User> {
    const { data } = await apiClient.get<ApiSuccessResponse<User>>("/auth/profile");
    return data.data;
  },
};

// Swapped wholesale based on NEXT_PUBLIC_USE_MOCK_API — every caller imports
// `authService` from this module, so flipping the flag (and removing this
// branch later) needs no changes anywhere else in the app.
export const authService = IS_MOCK_MODE ? mockAuthService : realAuthService;
