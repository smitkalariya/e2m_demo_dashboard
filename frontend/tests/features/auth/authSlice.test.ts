import authReducer, { fetchProfile, login, logout, register } from "@/features/auth/authSlice";
import { authService } from "@/services/auth.service";
import type { User } from "@/features/auth/types";

jest.mock("@/services/auth.service", () => ({
  authService: {
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    profile: jest.fn(),
  },
}));

const mockedAuthService = authService as jest.Mocked<typeof authService>;

function configureTestStore() {
  const { configureStore } = jest.requireActual("@reduxjs/toolkit");
  return configureStore({ reducer: { auth: authReducer } });
}

const user: User = {
  id: "u1",
  name: "Ada Lovelace",
  email: "ada@example.com",
  role: "admin",
  is_active: true,
  created_at: "2024-01-01T00:00:00.000Z",
};

describe("authSlice reducer", () => {
  const initialState = {
    user: null,
    status: "idle" as const,
    initialized: false,
    error: null,
  };

  it("returns the initial state", () => {
    expect(authReducer(undefined, { type: "unknown" })).toEqual(initialState);
  });

  it("sets status to loading and clears error on login.pending", () => {
    const state = authReducer(
      { ...initialState, error: "old error" },
      { type: login.pending.type }
    );
    expect(state.status).toBe("loading");
    expect(state.error).toBeNull();
  });

  it("stores the user and marks succeeded + initialized on login.fulfilled", () => {
    const state = authReducer(initialState, { type: login.fulfilled.type, payload: user });
    expect(state.status).toBe("succeeded");
    expect(state.user).toEqual(user);
    expect(state.initialized).toBe(true);
  });

  it("stores the rejection message and marks failed on login.rejected", () => {
    const state = authReducer(initialState, {
      type: login.rejected.type,
      payload: "Invalid email or password",
    });
    expect(state.status).toBe("failed");
    expect(state.error).toBe("Invalid email or password");
  });

  it("marks succeeded + initialized on register.fulfilled", () => {
    const state = authReducer(initialState, { type: register.fulfilled.type, payload: user });
    expect(state.status).toBe("succeeded");
    expect(state.user).toEqual(user);
    expect(state.initialized).toBe(true);
  });

  it("marks failed on register.rejected", () => {
    const state = authReducer(initialState, {
      type: register.rejected.type,
      payload: "Registration failed",
    });
    expect(state.status).toBe("failed");
    expect(state.error).toBe("Registration failed");
  });

  it("marks initialized and stores user on fetchProfile.fulfilled", () => {
    const state = authReducer(initialState, { type: fetchProfile.fulfilled.type, payload: user });
    expect(state.status).toBe("succeeded");
    expect(state.user).toEqual(user);
    expect(state.initialized).toBe(true);
  });

  it("clears the user but still marks initialized on fetchProfile.rejected", () => {
    const state = authReducer(
      { ...initialState, user, status: "loading" },
      { type: fetchProfile.rejected.type }
    );
    expect(state.status).toBe("idle");
    expect(state.user).toBeNull();
    expect(state.initialized).toBe(true);
  });

  it("clears the user and resets status on logout.fulfilled", () => {
    const state = authReducer(
      { ...initialState, user, status: "succeeded" },
      { type: logout.fulfilled.type }
    );
    expect(state.user).toBeNull();
    expect(state.status).toBe("idle");
  });
});

describe("authSlice async thunks", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("login() calls authService.login and stores the user on success", async () => {
    mockedAuthService.login.mockResolvedValueOnce(user);
    const store = configureTestStore();

    await store.dispatch(login({ email: user.email, password: "secret" }));

    expect(mockedAuthService.login).toHaveBeenCalledWith({ email: user.email, password: "secret" });
    expect(store.getState().auth.user).toEqual(user);
    expect(store.getState().auth.status).toBe("succeeded");
  });

  it("login() rejects with the extracted error message and never calls real network code", async () => {
    mockedAuthService.login.mockRejectedValueOnce({
      isAxiosError: true,
      response: { data: { message: "Bad credentials" } },
    });
    const store = configureTestStore();

    await store.dispatch(login({ email: "bad@example.com", password: "wrong" }));

    expect(store.getState().auth.status).toBe("failed");
    expect(store.getState().auth.error).toBe("Bad credentials");
  });

  it("login() falls back to a generic message when the error has no API message", async () => {
    mockedAuthService.login.mockRejectedValueOnce(new Error("network down"));
    const store = configureTestStore();

    await store.dispatch(login({ email: "bad@example.com", password: "wrong" }));

    expect(store.getState().auth.status).toBe("failed");
    expect(store.getState().auth.error).toBe("Invalid email or password");
  });

  it("register() calls authService.register and stores the user on success", async () => {
    mockedAuthService.register.mockResolvedValueOnce(user);
    const store = configureTestStore();

    await store.dispatch(register({ name: user.name, email: user.email, password: "secret123" }));

    expect(mockedAuthService.register).toHaveBeenCalledWith({
      name: user.name,
      email: user.email,
      password: "secret123",
    });
    expect(store.getState().auth.user).toEqual(user);
  });

  it("fetchProfile() calls authService.profile and marks initialized", async () => {
    mockedAuthService.profile.mockResolvedValueOnce(user);
    const store = configureTestStore();

    await store.dispatch(fetchProfile());

    expect(mockedAuthService.profile).toHaveBeenCalledTimes(1);
    expect(store.getState().auth.initialized).toBe(true);
    expect(store.getState().auth.user).toEqual(user);
  });

  it("logout() calls authService.logout and clears the user", async () => {
    mockedAuthService.logout.mockResolvedValueOnce(undefined);
    const store = configureTestStore();

    await store.dispatch(logout());

    expect(mockedAuthService.logout).toHaveBeenCalledTimes(1);
    expect(store.getState().auth.user).toBeNull();
  });
});
