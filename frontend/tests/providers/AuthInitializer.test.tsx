import { render } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { usePathname } from "next/navigation";
import { AuthInitializer } from "@/providers/AuthInitializer";
import authReducer from "@/features/auth/authSlice";
import { authService } from "@/services/auth.service";

jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
}));

jest.mock("@/services/auth.service", () => ({
  authService: { profile: jest.fn() },
}));

const mockedUsePathname = usePathname as jest.Mock;
const mockedProfile = authService.profile as jest.Mock;

function renderAt(pathname: string) {
  mockedUsePathname.mockReturnValue(pathname);
  const store = configureStore({ reducer: { auth: authReducer } });
  render(
    <Provider store={store}>
      <AuthInitializer>
        <div />
      </AuthInitializer>
    </Provider>
  );
  return store;
}

describe("AuthInitializer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("does not fetch the profile while on /login", () => {
    renderAt("/login");
    expect(mockedProfile).not.toHaveBeenCalled();
  });

  it("does not fetch the profile while on /register", () => {
    renderAt("/register");
    expect(mockedProfile).not.toHaveBeenCalled();
  });

  it("fetches the profile on a protected route", () => {
    mockedProfile.mockResolvedValue({
      id: "u1",
      name: "Test",
      email: "test@example.com",
      role: "user",
      is_active: true,
      created_at: "2026-01-01T00:00:00.000Z",
    });
    renderAt("/dashboard");
    expect(mockedProfile).toHaveBeenCalledTimes(1);
  });
});
