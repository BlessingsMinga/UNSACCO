"use client";

import { useApp } from "@/lib/store";
import { DashboardLayout, type NavItem } from "@/components/unissaco/shared/dashboard-layout";
import {
  LayoutDashboard,
  PiggyBank,
  TrendingUp,
  Sprout,
  FileText,
  UserCircle,
} from "lucide-react";
import { OverviewTab } from "@/components/unissaco/dashboard/tabs/overview";
import { SavingsTab } from "@/components/unissaco/dashboard/tabs/savings";
import { SharesTab } from "@/components/unissaco/dashboard/tabs/shares";
import { InvestmentsTab } from "@/components/unissaco/dashboard/tabs/investments";
import { ReportsTab } from "@/components/unissaco/dashboard/tabs/reports";
import { ProfileTab } from "@/components/unissaco/dashboard/tabs/profile";

const NAV: NavItem[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "savings", label: "Savings", icon: PiggyBank },
  { key: "shares", label: "Shares", icon: TrendingUp },
  { key: "investments", label: "Investments", icon: Sprout },
  { key: "reports", label: "Reports", icon: FileText },
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
      {dashboardTab === "investments" && <InvestmentsTab />}
      {dashboardTab === "reports" && <ReportsTab />}
      {dashboardTab === "profile" && <ProfileTab />}
    </DashboardLayout>
  );
}
