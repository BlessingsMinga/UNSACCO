"use client";

import { useApp } from "@/lib/store";
import { DashboardLayout, type NavItem } from "@/components/unissaco/shared/dashboard-layout";
import {
  LayoutDashboard,
  Users,
  Landmark,
  Receipt,
  ShieldCheck,
} from "lucide-react";
import { AdminOverviewTab } from "@/components/unissaco/admin/tabs/overview";
import { AdminMembersTab } from "@/components/unissaco/admin/tabs/members";
import { AdminLoansTab } from "@/components/unissaco/admin/tabs/loans";
import { AdminTransactionsTab } from "@/components/unissaco/admin/tabs/transactions";
import { AdminAuditTab } from "@/components/unissaco/admin/tabs/audit";

const NAV: NavItem[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "members", label: "Members", icon: Users },
  { key: "loans", label: "Loans", icon: Landmark },
  { key: "transactions", label: "Transactions", icon: Receipt },
  { key: "audit", label: "Audit Log", icon: ShieldCheck },
];

export function AdminDashboard() {
  const { user, adminTab, setAdminTab } = useApp();
  if (!user) return null;

  return (
    <DashboardLayout
      user={user}
      navItems={NAV}
      activeKey={adminTab}
      onNavigate={(k) => setAdminTab(k as typeof adminTab)}
      badgeLabel={user.role === "SUPER_ADMIN" ? "Super Admin" : "Admin"}
    >
      {adminTab === "overview" && <AdminOverviewTab />}
      {adminTab === "members" && <AdminMembersTab />}
      {adminTab === "loans" && <AdminLoansTab />}
      {adminTab === "transactions" && <AdminTransactionsTab />}
      {adminTab === "audit" && <AdminAuditTab />}
    </DashboardLayout>
  );
}
