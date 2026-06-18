"use client";

import { useEffect } from "react";
import { useApp } from "@/lib/store";
import { api, type ApiUser } from "@/lib/api-client";
import { LandingPage } from "@/components/unissaco/landing/landing-page";
import { AuthScreen } from "@/components/unissaco/auth/auth-screen";
import { MemberDashboard } from "@/components/unissaco/dashboard/member-dashboard";
import { AdminDashboard } from "@/components/unissaco/admin/admin-dashboard";
import { FullPageLoader } from "@/components/unissaco/shared/loaders";

export function AppShell() {
  const { user, loadingSession, view, setUser, setLoadingSession } = useApp();

  // Restore session on first load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<{ user: ApiUser | null; authenticated: boolean }>(
          "/api/auth/session"
        );
        if (cancelled) return;
        setUser(res.user);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoadingSession(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setUser, setLoadingSession]);

  if (loadingSession) return <FullPageLoader />;

  if (!user) {
    if (view === "login" || view === "register") return <AuthScreen />;
    return <LandingPage />;
  }

  // Authenticated
  if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") {
    return <AdminDashboard />;
  }
  return <MemberDashboard />;
}
