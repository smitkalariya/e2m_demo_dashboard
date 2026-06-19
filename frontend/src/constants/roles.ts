import type { UserRole } from "@/features/auth/types";

export const ROLES: Record<string, UserRole> = {
  ADMIN: "admin",
  MANAGER: "manager",
  USER: "user",
};

export const MANAGE_CUSTOMERS_ROLES: UserRole[] = ["admin", "manager"];
export const TRIGGER_AI_INSIGHT_ROLES: UserRole[] = ["admin", "manager"];
