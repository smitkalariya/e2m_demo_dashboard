import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { getCurrentPathname, hardNavigate } from "@/utils/navigation";

declare module "axios" {
  export interface InternalAxiosRequestConfig {
    _retry?: boolean;
  }
}

export const apiClient = axios.create({
  baseURL: "/api/v1",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

let refreshPromise: Promise<void> | null = null;

async function refreshSession(): Promise<void> {
  if (!refreshPromise) {
    refreshPromise = apiClient
      .post("/auth/refresh")
      .then(() => undefined)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

const PUBLIC_PATHS = ["/auth/login", "/auth/register", "/auth/refresh"];

// Refresh failed (or there was nothing to refresh) — the session is dead.
// Clear the httpOnly cookies server-side via /auth/logout (best-effort; it
// never 401s) and hard-navigate to /login so the user never sees a raw
// "invalid or expired token" error, just a normal logged-out state.
async function forceLogoutAndRedirect(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await apiClient.post("/auth/logout");
  } catch {
    // Cookies may already be gone — proceed to redirect regardless.
  }
  if (!getCurrentPathname().startsWith("/login")) {
    hardNavigate("/login");
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as InternalAxiosRequestConfig | undefined;
    const isPublicPath = PUBLIC_PATHS.some((path) => config?.url?.includes(path));

    if (error.response?.status === 401 && config && !config._retry && !isPublicPath) {
      config._retry = true;
      try {
        await refreshSession();
        return apiClient(config);
      } catch {
        await forceLogoutAndRedirect();
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export function extractErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string } | undefined;
    if (data?.message) return data.message;
  }
  return fallback;
}
