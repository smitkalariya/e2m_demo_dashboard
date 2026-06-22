import type { LoginPayload, RegisterPayload, User } from "@/features/auth/types";
import { delay } from "../utils";

const SESSION_STORAGE_KEY = "e2m_mock_session";
const SESSION_COOKIE = "access_token";

class MockAuthError extends Error {}

function nameFromEmail(email: string): string {
  const local = email.split("@")[0] || "Demo User";
  const words = local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1));
  return words.length > 0 ? words.join(" ") : "Demo User";
}

function buildUser(email: string, name?: string): User {
  return {
    id: "mock-user-1",
    name: name?.trim() || nameFromEmail(email),
    email,
    role: "admin",
    is_active: true,
    created_at: "2025-01-15T09:00:00.000Z",
  };
}

function setSessionCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${SESSION_COOKIE}=mock-session; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`;
}

function clearSessionCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

function persistSession(user: User): void {
  setSessionCookie();
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
  } catch {
    // ignore storage failures — the cookie alone is enough to pass the route guard
  }
}

function readSession(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function clearSession(): void {
  clearSessionCookie();
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export const mockAuthService = {
  async login(payload: LoginPayload): Promise<User> {
    await delay();
    const user = buildUser(payload.email);
    persistSession(user);
    return user;
  },

  async register(payload: RegisterPayload): Promise<User> {
    await delay();
    const user = buildUser(payload.email, payload.name);
    persistSession(user);
    return user;
  },

  async logout(): Promise<void> {
    await delay(150);
    clearSession();
  },

  async profile(): Promise<User> {
    await delay(150);
    const user = readSession();
    if (!user) throw new MockAuthError("Not authenticated");
    return user;
  },
};
