import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { LoginForm } from "@/features/auth/components/LoginForm";
import authReducer from "@/features/auth/authSlice";
import { authService } from "@/services/auth.service";

const pushMock = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

jest.mock("@/services/auth.service", () => ({
  authService: {
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    profile: jest.fn(),
  },
}));

const mockedAuthService = authService as jest.Mocked<typeof authService>;

function renderLoginForm() {
  const store = configureStore({ reducer: { auth: authReducer } });
  render(
    <Provider store={store}>
      <LoginForm />
    </Provider>
  );
  return store;
}

describe("LoginForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the email and password fields", () => {
    renderLoginForm();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("shows validation errors when submitting empty fields", async () => {
    const user = userEvent.setup();
    renderLoginForm();

    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText(/enter a valid email address/i)).toBeInTheDocument();
    expect(await screen.findByText(/password is required/i)).toBeInTheDocument();
    expect(mockedAuthService.login).not.toHaveBeenCalled();
  });

  it("shows a validation error for a malformed email without calling the service", async () => {
    // Note: ".a@b.com" passes the browser's native <input type="email"> constraint
    // validation (so jsdom won't silently block the submit before React Hook Form
    // runs), but fails the stricter zod `.email()` pattern used by loginSchema
    // (local part may not start with a dot). This exercises zod-level validation
    // specifically, as opposed to native HTML5 validation.
    const user = userEvent.setup();
    renderLoginForm();

    await user.type(screen.getByLabelText(/email/i), ".a@b.com");
    await user.type(screen.getByLabelText(/password/i), "secret123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText(/enter a valid email address/i)).toBeInTheDocument();
    expect(mockedAuthService.login).not.toHaveBeenCalled();
  });

  it("calls authService.login with form values and navigates to the dashboard on success", async () => {
    mockedAuthService.login.mockResolvedValueOnce({
      id: "u1",
      name: "Ada Lovelace",
      email: "ada@example.com",
      role: "user",
      is_active: true,
      created_at: "2026-01-01T00:00:00.000Z",
    });
    const user = userEvent.setup();
    renderLoginForm();

    await user.type(screen.getByLabelText(/email/i), "ada@example.com");
    await user.type(screen.getByLabelText(/password/i), "secret123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(mockedAuthService.login).toHaveBeenCalledWith({
        email: "ada@example.com",
        password: "secret123",
      });
    });
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dashboard"));
  });

  it("shows the rejected error message and does not navigate when login fails", async () => {
    mockedAuthService.login.mockRejectedValueOnce({
      isAxiosError: true,
      response: { data: { message: "Invalid email or password" } },
    });
    const user = userEvent.setup();
    renderLoginForm();

    await user.type(screen.getByLabelText(/email/i), "ada@example.com");
    await user.type(screen.getByLabelText(/password/i), "wrong-password");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText(/invalid email or password/i)).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
