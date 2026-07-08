"use client";

import { useApp } from "@/lib/store";
import { DashboardLayout, type NavItem } from "@/components/unissaco/shared/dashboard-layout";
import {
  LayoutDashboard,
  PiggyBank,
  TrendingUp,
  Landmark,
  Sprout,
  Gift,
  FileText,
  UserCircle,
  Bell,
} from "lucide-react";
import { OverviewTab } from "@/components/unissaco/dashboard/tabs/overview";
import { SavingsTab } from "@/components/unissaco/dashboard/tabs/savings";
import { SharesTab } from "@/components/unissaco/dashboard/tabs/shares";
import { LoansTab } from "@/components/unissaco/dashboard/tabs/loans";
import { DividendsTab } from "@/components/unissaco/dashboard/tabs/dividends";
import { InvestmentsTab } from "@/components/unissaco/dashboard/tabs/investments";
import { ReportsTab } from "@/components/unissaco/dashboard/tabs/reports";
import { ProfileTab } from "@/components/unissaco/dashboard/tabs/profile";
import { NotificationSettingsTab } from "@/components/unissaco/dashboard/tabs/notifications-settings";

const NAV: NavItem[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "savings", label: "Savings", icon: PiggyBank },
  { key: "shares", label: "Shares", icon: TrendingUp },
  { key: "loans", label: "Loans", icon: Landmark },
  { key: "investments", label: "Investments", icon: Sprout },
  { key: "dividends", label: "Dividends", icon: Gift },
  { key: "reports", label: "Reports", icon: FileText },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "profile", label: "Profile", icon: UserCircle },
];

export function MemberDashboard() {
  const { user, dashboardTab, setDashboardTab } = useApp();
  if (!user) return null;

  return (
    <DashboardLayout
      user={user}
      navItems={NAV}
      activeKey={dashboardTab}
      onNavigate={(k) => setDashboardTab(k as typeof dashboardTab)}
      badgeLabel="Member"
    >
      {dashboardTab === "overview" && <OverviewTab />}
      {dashboardTab === "savings" && <SavingsTab />}
      {dashboardTab === "shares" && <SharesTab />}
      {dashboardTab === "loans" && <LoansTab />}
      {dashboardTab === "investments" && <InvestmentsTab />}
      {dashboardTab === "dividends" && <DividendsTab />}
      {dashboardTab === "reports" && <ReportsTab />}
      {dashboardTab === "notifications" && <NotificationSettingsTab />}
      {dashboardTab === "profile" && <ProfileTab />}
    </DashboardLayout>
  );
}