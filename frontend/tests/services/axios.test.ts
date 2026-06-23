import type { AxiosRequestConfig } from "axios";
import { apiClient } from "@/services/axios";
import { getCurrentPathname, hardNavigate } from "@/utils/navigation";

jest.mock("@/utils/navigation", () => ({
  getCurrentPathname: jest.fn(),
  hardNavigate: jest.fn(),
}));

const mockedGetCurrentPathname = getCurrentPathname as jest.Mock;
const mockedHardNavigate = hardNavigate as jest.Mock;

type MockAdapter = (config: AxiosRequestConfig) => Promise<unknown>;

function axiosError(status: number, message: string, config: AxiosRequestConfig) {
  const error = new Error(message) as Error & {
    isAxiosError: true;
    response: { status: number; data: { message: string } };
    config: AxiosRequestConfig;
  };
  error.isAxiosError = true;
  error.response = { status, data: { message } };
  error.config = config;
  return error;
}

describe("apiClient response interceptor", () => {
  const originalAdapter = apiClient.defaults.adapter;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter;
  });

  it("clears the session and redirects to /login when a 401 survives a failed refresh", async () => {
    mockedGetCurrentPathname.mockReturnValue("/dashboard");

    const calls: string[] = [];
    const adapter: MockAdapter = async (config) => {
      calls.push(config.url ?? "");
      if (config.url === "/dashboard/metrics") {
        throw axiosError(401, "Invalid or expired access token", config);
      }
      if (config.url === "/auth/refresh") {
        throw axiosError(401, "Refresh token missing", config);
      }
      if (config.url === "/auth/logout") {
        return { data: { success: true, message: "Logged out successfully" }, status: 200, config, headers: {} };
      }
      throw new Error(`Unexpected request to ${config.url}`);
    };
    apiClient.defaults.adapter = adapter as never;

    await expect(apiClient.get("/dashboard/metrics")).rejects.toMatchObject({
      response: { data: { message: "Invalid or expired access token" } },
    });

    expect(calls).toEqual(["/dashboard/metrics", "/auth/refresh", "/auth/logout"]);
    expect(mockedHardNavigate).toHaveBeenCalledWith("/login");
  });

  it("does not redirect again if already on /login", async () => {
    mockedGetCurrentPathname.mockReturnValue("/login");

    const adapter: MockAdapter = async (config) => {
      if (config.url === "/auth/refresh") {
        throw axiosError(401, "Refresh token missing", config);
      }
      if (config.url === "/auth/logout") {
        return { data: { success: true, message: "Logged out successfully" }, status: 200, config, headers: {} };
      }
      throw axiosError(401, "Invalid or expired access token", config);
    };
    apiClient.defaults.adapter = adapter as never;

    await expect(apiClient.get("/customers")).rejects.toBeDefined();

    expect(mockedHardNavigate).not.toHaveBeenCalled();
  });

  it("does not call logout when a request fails for a reason other than 401", async () => {
    mockedGetCurrentPathname.mockReturnValue("/dashboard");

    const calls: string[] = [];
    const adapter: MockAdapter = async (config) => {
      calls.push(config.url ?? "");
      throw axiosError(500, "Internal server error", config);
    };
    apiClient.defaults.adapter = adapter as never;

    await expect(apiClient.get("/customers")).rejects.toMatchObject({
      response: { status: 500 },
    });

    expect(calls).toEqual(["/customers"]);
    expect(mockedHardNavigate).not.toHaveBeenCalled();

  });
});
