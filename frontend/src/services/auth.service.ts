import { apiClient } from "@/services/axios";
import type { LoginPayload, RegisterPayload, User } from "@/features/auth/types";
import type { ApiSuccessResponse } from "@/types/api";

export const authService = {
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
