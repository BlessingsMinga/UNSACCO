"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import { formatCurrency, formatDate, formatDateTime, SHARE_PRICE } from "@/lib/constants";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/unissaco/shared/stat-card";
import { StatusBadge } from "@/components/unissaco/shared/status-badge";
import { EmptyState } from "@/components/unissaco/shared/empty-state";
import { useApp } from "@/lib/store";
import {
  PiggyBank,
  TrendingUp,
  Wallet,
  Sprout,
  ArrowRight,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  Info,
  FileText,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { motion } from "framer-motion";

type DashboardData = {
  user: { fullName: string; status: string; studentId: string; program: string; yearOfStudy: string; joinedAt: string };
  savingsBalance: number;
  interestAccrued: number;
  numberOfShares: number;
  shareValue: number;
  netWorth: number;
  monthlyFlow: { label: string; deposits: number; withdrawals: number }[];
  totalDeposits6m: number;
  recentSavings: {
    id: string; type: string; amount: number; balanceAfter: number; description: string; reference: string; createdAt: string;
  }[];
  recentShares: {
    id: string; type: string; numberOfShares: number; totalAmount: number; reference: string; createdAt: string;
  }[];
  investments: {
    id: string; name: string; category: string; status: string; contributed: number; sharePct: number; expectedReturn: number; actualReturn: number; expectedROI: number;
  }[];
};

export function OverviewTab() {
  const { user, setDashboardTab } = useApp();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get<DashboardData>("/api/reports/dashboard");
        if (!cancelled) setData(res);
      } catch (e) {
        if (!cancelled) setError(e instanceof ApiError ? e.message : "Failed to load dashboard.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <OverviewSkeleton />;
  if (error || !data)
    return (
      <EmptyState
        icon={Info}
        title="Couldn't load your dashboard"
        description={error ?? "Please try again."}
        action={<Button onClick={() => window.location.reload()}>Retry</Button>}
      />
    );

  const isPending = data.user.status === "PENDING";

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Hello, {data.user.fullName?.split(" ")[0] ?? "member"} 👋
          </h2>
          <p className="text-sm text-muted-foreground">
            {data.user.program} · {data.user.yearOfStudy} · ID {data.user.studentId}
          </p>
        </div>
        <StatusBadge status={data.user.status} />
      </div>

      {/* Pending banner */}
      {isPending && (
        <Card className="p-4 border-amber-300/50 bg-amber-50/60 dark:bg-amber-500/10 flex items-start gap-3">
          <div className="size-9 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
            <Clock className="size-4 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm text-amber-800 dark:text-amber-300">Membership pending approval</p>
            <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5">
              Your account is awaiting administrator approval. You can explore your dashboard, but savings and share
              transactions will unlock once your membership is activated.
            </p>
          </div>
        </Card>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Savings balance" value={formatCurrency(data.savingsBalance)} icon={PiggyBank} hint={`+${formatCurrency(data.interestAccrued)} interest`} accent="primary" />
        <StatCard label="Share value" value={formatCurrency(data.shareValue)} icon={TrendingUp} hint={`${data.numberOfShares} shares`} accent="gold" />
        <StatCard label="Net worth" value={formatCurrency(data.netWorth)} icon={Wallet} hint="Savings + shares" accent="violet" />
        <StatCard label="Investments" value={data.investments.length.toString()} icon={Sprout} hint={`${formatCurrency(data.investments.reduce((s, i) => s + i.contributed, 0))} contributed`} accent="sky" />
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">Savings flow</h3>
              <p className="text-xs text-muted-foreground">Deposits vs withdrawals · last 6 months</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Saved (6mo)</p>
              <p className="font-bold tabular-nums">{formatCurrency(data.totalDeposits6m)}</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.monthlyFlow} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="depGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.6 0.13 162)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="oklch(0.6 0.13 162)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="wdrGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.65 0.18 45)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="oklch(0.65 0.18 45)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0 0 0 / 0.06)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip
                  formatter={(v: number, n) => [formatCurrency(v), n === "deposits" ? "Deposits" : "Withdrawals"]}
                  contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 12 }}
                />
                <Legend formatter={(v) => <span className="text-xs capitalize">{v}</span>} />
                <Area type="monotone" dataKey="deposits" stroke="oklch(0.55 0.13 162)" strokeWidth={2} fill="url(#depGrad)" />
                <Area type="monotone" dataKey="withdrawals" stroke="oklch(0.65 0.18 45)" strokeWidth={2} fill="url(#wdrGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Quick actions */}
        <Card className="p-5">
          <h3 className="font-semibold mb-1">Quick actions</h3>
          <p className="text-xs text-muted-foreground mb-4">Manage your money in one tap</p>
          <div className="space-y-2.5">
            <ActionRow icon={ArrowDownLeft} title="Make a deposit" desc="Add to your savings" onClick={() => setDashboardTab("savings")} accent="primary" />
            <ActionRow icon={TrendingUp} title="Buy shares" desc={`${formatCurrency(SHARE_PRICE)} per share`} onClick={() => setDashboardTab("shares")} accent="gold" />
            <ActionRow icon={Sprout} title="View investments" desc="Track your ventures" onClick={() => setDashboardTab("investments")} accent="sky" />
            <ActionRow icon={FileText} title="Download statement" desc="Export your report" onClick={() => setDashboardTab("reports")} accent="violet" />
          </div>
        </Card>
      </div>

      {/* Recent activity + portfolio */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Recent savings activity</h3>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setDashboardTab("savings")}>
              View all <ArrowRight className="size-3.5 ml-1" />
            </Button>
          </div>
          {data.recentSavings.length === 0 ? (
            <EmptyState icon={PiggyBank} title="No transactions yet" description="Your savings activity will appear here." />
          ) : (
            <div className="space-y-1 max-h-72 overflow-y-auto">
              {data.recentSavings.map((t) => {
                const positive = t.type === "DEPOSIT" || t.type === "INTEREST" || t.type === "DIVIDEND";
                return (
                  <div key={t.id} className="flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0">
                    <div className={`size-9 rounded-lg flex items-center justify-center shrink-0 ${positive ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"}`}>
                      {positive ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{t.description}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(t.createdAt)} · {t.type}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold tabular-nums ${positive ? "text-emerald-600" : "text-rose-600"}`}>
                        {positive ? "+" : "−"}{formatCurrency(t.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground tabular-nums">Bal {formatCurrency(t.balanceAfter)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">My investment portfolio</h3>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setDashboardTab("investments")}>
              View all <ArrowRight className="size-3.5 ml-1" />
            </Button>
          </div>
          {data.investments.length === 0 ? (
            <EmptyState icon={Sprout} title="No investments yet" description="You haven't joined any cooperative investments." />
          ) : (
            <div className="space-y-3">
              {data.investments.map((inv) => (
                <div key={inv.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
                  <div className="size-10 rounded-lg bg-gradient-to-br from-primary/15 to-amber-500/10 flex items-center justify-center shrink-0">
                    <Sprout className="size-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{inv.name}</p>
                    <p className="text-xs text-muted-foreground">{inv.category} · {formatCurrency(inv.contributed)} contributed</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-emerald-600">+{inv.expectedROI}%</p>
                    <StatusBadge status={inv.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Membership summary */}
      <Card className="p-5">
        <h3 className="font-semibold mb-3">Membership summary</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <Info2 label="Member since" value={formatDate(data.user.joinedAt)} />
          <Info2 label="Student ID" value={data.user.studentId} />
          <Info2 label="Shareholding" value={`${data.numberOfShares} shares`} />
          <Info2 label="Expected annual interest" value={formatCurrency((data.savingsBalance * 0.08))} />
        </div>
      </Card>
    </div>
  );
}

function ActionRow({ icon: Icon, title, desc, onClick, accent }: { icon: typeof PiggyBank; title: string; desc: string; onClick: () => void; accent: "primary" | "gold" | "violet" | "sky" }) {
  const colors = {
    primary: "bg-primary/10 text-primary",
    gold: "bg-amber-500/15 text-amber-600",
    violet: "bg-violet-500/15 text-violet-600",
    sky: "bg-sky-500/15 text-sky-600",
  };
  return (
    <motion.button
      whileHover={{ x: 2 }}
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/60 transition-colors text-left"
    >
      <div className={`size-9 rounded-lg flex items-center justify-center shrink-0 ${colors[accent]}`}>
        <Icon className="size-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <ArrowRight className="size-4 text-muted-foreground" />
    </motion.button>
  );
}

function Info2({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold mt-0.5">{value}</p>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <Skeleton className="lg:col-span-2 h-80" />
        <Skeleton className="h-80" />
      </div>
    </div>
  );
}
