import { useAppSelector } from "@/store/hooks";
import type { UserRole } from "@/features/auth/types";

export function useAuth() {
  const { user, status, initialized } = useAppSelector((state) => state.auth);

  const hasRole = (...roles: UserRole[]) => Boolean(user && roles.includes(user.role));

  return {
    user,
    isAuthenticated: Boolean(user),
    isLoading: status === "loading" && !initialized,
    initialized,
    hasRole,
  };
}
