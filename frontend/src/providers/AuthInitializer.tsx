"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchProfile } from "@/features/auth/authSlice";

// /login and /register never need a profile check — an authenticated visitor
// is already redirected away from them server-side (src/proxy.ts), and for a
// genuine fresh visitor this would just be a doomed-to-401 request. Skipping
// it here also avoids a background fetchProfile -> failed-refresh -> logout
// chain racing with (and clobbering) the cookies a concurrent, successful
// login on this same page just set.
const SKIP_PROFILE_FETCH_PATHS = ["/login", "/register"];

export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const pathname = usePathname();
  const initialized = useAppSelector((state) => state.auth.initialized);

  useEffect(() => {
    const isPublicAuthPath = SKIP_PROFILE_FETCH_PATHS.some((path) => pathname?.startsWith(path));
    if (!initialized && !isPublicAuthPath) {
      dispatch(fetchProfile());
    }
  }, [dispatch, initialized, pathname]);

  return <>{children}</>;
}
