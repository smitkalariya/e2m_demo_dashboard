"use client";

import { useRouter } from "next/navigation";
import { useAppDispatch } from "@/store/hooks";
import { logout } from "@/features/auth/authSlice";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  manager: "Manager",
  user: "User",
};

export function ProfileView() {
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const router = useRouter();

  if (!user) return null;

  const handleLogout = async () => {
    await dispatch(logout());
    router.push("/login");
  };

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-semibold text-slate-900">Profile</h1>

      <div className="mt-6 flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5">
        <div>
          <p className="text-xs font-medium uppercase text-slate-500">Name</p>
          <p className="text-sm text-slate-900">{user.name}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-slate-500">Email</p>
          <p className="text-sm text-slate-900">{user.email}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-slate-500">Role</p>
          <Badge tone="info">{ROLE_LABEL[user.role] ?? user.role}</Badge>
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-slate-500">Member since</p>
          <p className="text-sm text-slate-900">{new Date(user.created_at).toLocaleDateString()}</p>
        </div>
      </div>

      <Button variant="danger" className="mt-6" onClick={handleLogout}>
        Log out
      </Button>
    </div>
  );
}
