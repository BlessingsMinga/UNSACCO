"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import { formatCurrency, formatDate, formatNumber } from "@/lib/constants";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/unissaco/shared/status-badge";
import { EmptyState } from "@/components/unissaco/shared/empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Sprout,
  TrendingUp,
  Wallet,
  PieChart,
  Plus,
  ArrowRight,
  Leaf,
  Building2,
  Landmark,
  Lightbulb,
} from "lucide-react";

type Investment = {
  id: string;
  name: string;
  category: string;
  description: string;
  amountInvested: number;
  expectedROI: number;
  actualProfit: number;
  status: string;
  startDate: string;
  endDate: string | null;
  imageUrl: string | null;
  members: { userId: string; amountContributed: number; sharePct: number; user: { fullName: string | null; studentId: string | null } }[];
};

const CATEGORY_ICONS: Record<string, typeof Sprout> = {
  AGRICULTURE: Leaf,
  STUDENT_VENTURE: Lightbulb,
  FIXED_INCOME: Landmark,
  REAL_ESTATE: Building2,
  OTHER: PieChart,
};

export function InvestmentsTab() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Investment | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await api.get<{ investments: Investment[] }>("/api/investments");
        setInvestments(res.investments);
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : "Failed to load investments.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48" />)}
        </div>
      </div>
    );
  }

  const totalInvested = investments.reduce((s, i) => s + i.amountInvested, 0);
  const totalProfit = investments.reduce((s, i) => s + i.actualProfit, 0);
  const activeCount = investments.filter((i) => i.status === "ACTIVE").length;
  const avgROI = investments.length
    ? investments.reduce((s, i) => s + i.expectedROI, 0) / investments.length
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Investments</h2>
        <p className="text-sm text-muted-foreground">
          Cooperative ventures where your savings grow · Profits shared by shareholding
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Capital deployed" value={formatCurrency(totalInvested)} icon={Wallet} accent="primary" />
        <SummaryCard label="Realised profit" value={formatCurrency(totalProfit)} icon={TrendingUp} accent="gold" />
        <SummaryCard label="Active ventures" value={activeCount} icon={Sprout} accent="sky" />
        <SummaryCard label="Avg. expected ROI" value={`${avgROI.toFixed(1)}%`} icon={PieChart} accent="violet" />
      </div>

      {investments.length === 0 ? (
        <Card className="p-6">
          <EmptyState icon={Sprout} title="No investments yet" description="Cooperative investments will appear here once created by administrators." />
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {investments.map((inv) => {
            const Icon = CATEGORY_ICONS[inv.category] ?? Sprout;
            const profitPct = inv.amountInvested > 0 ? (inv.actualProfit / inv.amountInvested) * 100 : 0;
            const memberCount = inv.members.length;
            return (
              <Card key={inv.id} className="p-5 hover:shadow-lg hover:border-primary/30 transition-all cursor-pointer flex flex-col" onClick={() => setSelected(inv)}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-11 rounded-xl bg-gradient-to-br from-primary/15 to-amber-500/10 flex items-center justify-center shrink-0">
                      <Icon className="size-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate">{inv.name}</h3>
                      <p className="text-xs text-muted-foreground">{inv.category.replace("_", " ").toLowerCase()}</p>
                    </div>
                  </div>
                  <StatusBadge status={inv.status} />
                </div>

                <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">{inv.description}</p>

                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Invested</p>
                    <p className="font-semibold text-sm tabular-nums">{formatCurrency(inv.amountInvested, { compact: true })}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Expected ROI</p>
                    <p className="font-semibold text-sm text-emerald-600">{inv.expectedROI}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Members</p>
                    <p className="font-semibold text-sm tabular-nums">{memberCount}</p>
                  </div>
                </div>

                {inv.actualProfit > 0 && (
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Profit realised</span>
                      <span className="font-medium text-emerald-600">{formatCurrency(inv.actualProfit)} ({profitPct.toFixed(1)}%)</span>
                    </div>
                    <Progress value={Math.min(profitPct, 100)} className="h-1.5" />
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Started {formatDate(inv.startDate)}</span>
                  <span className="text-primary font-medium inline-flex items-center gap-1">
                    View details <ArrowRight className="size-3" />
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <StatusBadge status={selected.status} />
                  <span className="text-xs text-muted-foreground">{selected.category.replace("_", " ").toLowerCase()}</span>
                </div>
                <DialogTitle className="text-xl">{selected.name}</DialogTitle>
                <DialogDescription>{selected.description}</DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2">
                <Stat label="Capital" value={formatCurrency(selected.amountInvested)} />
                <Stat label="Expected ROI" value={`${selected.expectedROI}%`} accent="text-emerald-600" />
                <Stat label="Profit" value={formatCurrency(selected.actualProfit)} accent="text-emerald-600" />
                <Stat label="Members" value={formatNumber(selected.members.length)} />
              </div>

              <div className="rounded-lg bg-muted/40 p-3 text-sm">
                <div className="flex justify-between mb-1">
                  <span className="text-muted-foreground">Start date</span>
                  <span className="font-medium">{formatDate(selected.startDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">End date</span>
                  <span className="font-medium">{selected.endDate ? formatDate(selected.endDate) : "Ongoing"}</span>
                </div>
              </div>

              {selected.members.length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-2">Participating members ({selected.members.length})</p>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {selected.members.map((m) => (
                      <div key={m.userId} className="flex items-center justify-between text-sm py-1.5 border-b border-border/50 last:border-0">
                        <span className="font-medium">{m.user.fullName ?? "Unknown"}</span>
                        <span className="text-muted-foreground tabular-nums">
                          {formatCurrency(m.amountContributed)} · {m.sharePct}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, accent }: { label: string; value: string | number; icon: typeof Sprout; accent: "primary" | "gold" | "violet" | "sky" }) {
  const colors = {
    primary: "bg-primary/10 text-primary",
    gold: "bg-amber-500/15 text-amber-600",
    violet: "bg-violet-500/15 text-violet-600",
    sky: "bg-sky-500/15 text-sky-600",
  };
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold mt-1.5 tabular-nums">{value}</p>
        </div>
        <div className={`size-10 rounded-xl flex items-center justify-center ${colors[accent]}`}>
          <Icon className="size-5" />
        </div>
      </div>
    </Card>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-lg bg-muted/40 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`font-semibold tabular-nums ${accent ?? ""}`}>{value}</p>
    </div>
  );
}
