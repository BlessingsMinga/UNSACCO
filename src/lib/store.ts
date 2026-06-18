// Global client state for UNISSACO: auth + view navigation.
import { create } from "zustand";
import type { ApiUser } from "@/lib/api-client";

export type AppView =
  | "landing"
  | "login"
  | "register"
  | "dashboard";

export type DashboardTab =
  | "overview"
  | "savings"
  | "shares"
  | "investments"
  | "reports"
  | "profile";

export type AdminTab = "overview" | "members" | "transactions" | "audit";

interface AppState {
  user: ApiUser | null;
  loadingSession: boolean;
  view: AppView;
  dashboardTab: DashboardTab;
  adminTab: AdminTab;

  setUser: (u: ApiUser | null) => void;
  setLoadingSession: (v: boolean) => void;
  setView: (v: AppView) => void;
  setDashboardTab: (t: DashboardTab) => void;
  setAdminTab: (t: AdminTab) => void;
  logout: () => void;
}

export const useApp = create<AppState>((set) => ({
  user: null,
  loadingSession: true,
  view: "landing",
  dashboardTab: "overview",
  adminTab: "overview",

  setUser: (u) =>
    set((s) => ({
      user: u,
      view: u ? "dashboard" : s.view === "dashboard" ? "landing" : s.view,
    })),
  setLoadingSession: (v) => set({ loadingSession: v }),
  setView: (v) => set({ view: v }),
  setDashboardTab: (t) => set({ dashboardTab: t }),
  setAdminTab: (t) => set({ adminTab: t }),
  logout: () => set({ user: null, view: "landing", dashboardTab: "overview" }),
}));
