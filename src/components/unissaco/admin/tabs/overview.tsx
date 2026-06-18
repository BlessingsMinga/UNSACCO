"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/constants";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/unissaco/shared/stat-card";
import { StatusBadge } from "@/components/unissaco/shared/status-badge";
import { useApp } from "@/lib/store";
import {
  Users,
  PiggyBank,
  Landmark,
  TrendingUp,
  ArrowDownLeft,
  Clock,
  UserCheck,
  ArrowRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

type Overview = {
  members: { total: number; pending: number; active: number; suspended: number };
  treasury: { totalSavings: number; shareCapital: number; totalShares: number; totalInvested: number; totalAssets: number };
  monthlyDeposits: { label: string; total: number }[];
  recentMembers: { id: string; fullName: string; studentId: string; email: string; program: string; status: string; createdAt: string }[];
  recentDeposits: { id: string; amount: number; createdAt: string; user: { fullName: string | null; studentId: string | null } }[];
};

export function AdminOverviewTab() {
  const { setAdminTab } = useApp();
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await api.get<Overview>("/api/admin/overview");
        setData(res);
      } catch (e) {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Admin Overview</h2>
          <p className="text-sm text-muted-foreground">Cooperative financial health at a glance</p>
        </div>
        {data.members.pending > 0 && (
          <Button onClick={() => setAdminTab("members")} className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-white">
            <Clock className="size-4" /> {data.members.pending} pending approval
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total members" value={data.members.total} icon={Users} hint={`${data.members.active} active`} accent="primary" />
        <StatCard label="Total savings" value={formatCurrency(data.treasury.totalSavings)} icon={PiggyBank} hint="member deposits" accent="gold" />
        <StatCard label="Share capital" value={formatCurrency(data.treasury.shareCapital)} icon={Landmark} hint={`${data.treasury.totalShares} shares`} accent="violet" />
        <StatCard label="Total assets" value={formatCurrency(data.treasury.totalAssets)} icon={TrendingUp} hint="savings + shares" accent="sky" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">Deposits trend</h3>
              <p className="text-xs text-muted-foreground">Total member deposits · last 6 months</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthlyDeposits} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0 0 0 / 0.06)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip
                  formatter={(v: number) => [formatCurrency(v), "Deposits"]}
                  contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 12 }}
                />
                <Bar dataKey="total" fill="oklch(0.55 0.13 162)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold mb-4">Member breakdown</h3>
          <div className="space-y-3">
            <BreakdownRow label="Active" value={data.members.active} total={data.members.total} color="bg-emerald-500" />
            <BreakdownRow label="Pending" value={data.members.pending} total={data.members.total} color="bg-amber-500" />
            <BreakdownRow label="Suspended" value={data.members.suspended} total={data.members.total} color="bg-rose-500" />
          </div>
          <div className="mt-5 pt-4 border-t border-border space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Investments deployed</span>
              <span className="font-semibold">{formatCurrency(data.treasury.totalInvested)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Avg. savings / member</span>
              <span className="font-semibold">{formatCurrency(data.members.total ? data.treasury.totalSavings / data.members.total : 0)}</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2"><UserCheck className="size-4 text-muted-foreground" /> Recent members</h3>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setAdminTab("members")}>View all <ArrowRight className="size-3.5 ml-1" /></Button>
          </div>
          <div className="space-y-1">
            {data.recentMembers.map((m) => (
              <div key={m.id} className="flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0">
                <div className="size-9 rounded-full brand-gradient flex items-center justify-center text-white text-xs font-semibold shrink-0">
                  {(m.fullName ?? "?").split(" ").map((p) => p[0]).slice(0, 2).join("")}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{m.fullName}</p>
                  <p className="text-xs text-muted-foreground truncate">{m.studentId} · {m.program}</p>
                </div>
                <div className="text-right">
                  <StatusBadge status={m.status} />
                  <p className="text-xs text-muted-foreground mt-1">{formatDate(m.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2"><ArrowDownLeft className="size-4 text-emerald-600" /> Recent deposits</h3>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setAdminTab("transactions")}>View all <ArrowRight className="size-3.5 ml-1" /></Button>
          </div>
          <div className="space-y-1">
            {data.recentDeposits.map((d) => (
              <div key={d.id} className="flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0">
                <div className="size-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <ArrowDownLeft className="size-4 text-emerald-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{d.user.fullName}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(d.createdAt)}</p>
                </div>
                <p className="text-sm font-semibold text-emerald-600 tabular-nums">+{formatCurrency(d.amount)}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function BreakdownRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
