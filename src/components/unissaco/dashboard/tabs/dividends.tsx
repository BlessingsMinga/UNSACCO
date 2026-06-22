"use client";

import { useEffect, useState, useCallback } from "react";
import { api, ApiError } from "@/lib/api-client";
import { formatCurrency, formatDate, formatDateTime, STATUS_COLORS } from "@/lib/constants";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/unissaco/shared/stat-card";
import { EmptyState } from "@/components/unissaco/shared/empty-state";
import { StatusBadge } from "@/components/unissaco/shared/status-badge";
import { toast } from "sonner";
import {
  Gift,
  PiggyBank,
  TrendingUp,
  CalendarCheck,
  Clock,
  CheckCircle2,
} from "lucide-react";

type DividendPayout = {
  id: string;
  numberOfShares: number;
  amountPerShare: number;
  totalAmount: number;
  deductedAtSource: number;
  netAmount: number;
  status: string;
  paidAt: string | null;
  reference: string | null;
  createdAt: string;
  declaration: {
    period: string;
    label: string;
    ratePerShare: number;
    declaredAt: string;
    status: string;
  };
};

export function DividendsTab() {
  const [payouts, setPayouts] = useState<DividendPayout[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get<DividendPayout[]>("/api/dividends");
      setPayouts(res);
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 401)) {
        toast.error("Failed to load dividends");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalDividends = payouts.reduce((sum, p) => sum + p.netAmount, 0);
  const paidCount = payouts.filter((p) => p.status === "PAID").length;
  const pendingCount = payouts.filter((p) => p.status === "PENDING").length;
  const totalShares = payouts.reduce((sum, p) => sum + p.numberOfShares, 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="Total Dividends"
          value={formatCurrency(totalDividends)}
          icon={Gift}
          accent="gold"
        />
        <StatCard
          label="Paid Out"
          value={paidCount.toString()}
          icon={CheckCircle2}
          hint={`${paidCount} payout${paidCount !== 1 ? "s" : ""}`}
          accent="primary"
        />
        <StatCard
          label="Pending"
          value={pendingCount.toString()}
          icon={Clock}
          hint={`${pendingCount} payout${pendingCount !== 1 ? "s" : ""}`}
          accent="sky"
        />
        <StatCard
          label="Eligible Shares"
          value={totalShares.toLocaleString()}
          icon={TrendingUp}
          accent="violet"
        />
      </div>

      {/* Payout History */}
      {payouts.length === 0 ? (
        <EmptyState
          icon={Gift}
          title="No dividends yet"
          description="Dividends will appear here once declared and paid out by the cooperative."
        />
      ) : (
        <div className="space-y-4">
          {payouts.map((payout) => (
            <Card key={payout.id} className="p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{payout.declaration.label}</h4>
                    <StatusBadge status={payout.status} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Period: {payout.declaration.period} | Declared: {formatDate(payout.declaration.declaredAt)}
                  </p>
                  <div className="flex gap-4 text-sm mt-2">
                    <span>
                      <strong>Shares:</strong> {payout.numberOfShares.toLocaleString()}
                    </span>
                    <span>
                      <strong>Rate:</strong> MK {payout.amountPerShare.toFixed(2)}/share
                    </span>
                    <span>
                      <strong>Gross:</strong> {formatCurrency(payout.totalAmount)}
                    </span>
                  </div>
                  {payout.deductedAtSource > 0 && (
                    <p className="text-xs text-rose-600">Withholding: {formatCurrency(payout.deductedAtSource)}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-emerald-600">{formatCurrency(payout.netAmount)}</p>
                  <p className="text-xs text-muted-foreground">Net received</p>
                  {payout.paidAt && (
                    <p className="text-xs text-muted-foreground mt-1">Paid: {formatDate(payout.paidAt)}</p>
                  )}
                  {payout.reference && (
                    <p className="text-xs text-muted-foreground">Ref: {payout.reference}</p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}