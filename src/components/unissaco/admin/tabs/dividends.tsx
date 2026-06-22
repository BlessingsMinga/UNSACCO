"use client";

import { useEffect, useState, useCallback } from "react";
import { api, ApiError } from "@/lib/api-client";
import { formatCurrency, formatDate, formatDateTime, STATUS_COLORS } from "@/lib/constants";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { StatCard } from "@/components/unissaco/shared/stat-card";
import { EmptyState } from "@/components/unissaco/shared/empty-state";
import { StatusBadge } from "@/components/unissaco/shared/status-badge";
import { toast } from "sonner";
import {
  Gift,
  CircleDollarSign,
  Users,
  TrendingUp,
  Loader2,
  Plus,
  Banknote,
  Clock,
  CheckCircle2,
} from "lucide-react";

type DividendDeclaration = {
  id: string;
  period: string;
  label: string;
  totalAmount: number;
  ratePerShare: number;
  eligibleShares: number;
  status: string;
  declaredById: string | null;
  declaredAt: string;
  paidOutAt: string | null;
  notes: string | null;
  createdAt: string;
  _count: { payouts: number };
  paidCount: number;
  paidAmount: number;
};

export function AdminDividendsTab() {
  const [declarations, setDeclarations] = useState<DividendDeclaration[]>([]);
  const [loading, setLoading] = useState(true);
  const [declareOpen, setDeclareOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Declare form
  const [period, setPeriod] = useState("");
  const [label, setLabel] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [notes, setNotes] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get<DividendDeclaration[]>("/api/admin/dividends");
      setDeclarations(res);
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 401)) {
        toast.error("Failed to load dividends");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDeclare = async () => {
    if (!period || !label || !totalAmount) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post<{ declaration: DividendDeclaration; totalEligibleShares: number; ratePerShare: number; memberCount: number }>(
        "/api/dividends/declare",
        { period, label, totalAmount: Number(totalAmount), notes }
      );
      toast.success(`Dividend declared! MK ${res.ratePerShare.toFixed(2)}/share for ${res.memberCount} members`);
      setDeclareOpen(false);
      setPeriod("");
      setLabel("");
      setTotalAmount("");
      setNotes("");
      fetchData();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to declare dividend");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayout = async (declarationId: string) => {
    setSubmitting(true);
    try {
      const res = await api.post<{ message: string; processedCount: number; totalPaid: number }>(
        "/api/dividends/payout",
        { declarationId }
      );
      toast.success(res.message);
      fetchData();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Payout failed");
    } finally {
      setSubmitting(false);
    }
  };

  const totalDeclared = declarations.reduce((s, d) => s + d.totalAmount, 0);
  const totalPaid = declarations.reduce((s, d) => s + d.paidAmount, 0);
  const totalMembers = declarations.reduce((s, d) => s + d._count.payouts, 0);
  const pendingPayouts = declarations.filter((d) => d.status === "DECLARED").length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total Declared" value={formatCurrency(totalDeclared)} icon={Gift} accent="gold" />
        <StatCard label="Total Paid Out" value={formatCurrency(totalPaid)} icon={Banknote} accent="primary" />
        <StatCard label="Member Payouts" value={totalMembers.toString()} icon={Users} accent="violet" />
        <StatCard label="Pending Payouts" value={pendingPayouts.toString()} icon={Clock} accent="sky" />
      </div>

      {/* Declare Button */}
      <div className="flex justify-end">
        <Dialog open={declareOpen} onOpenChange={setDeclareOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Declare Dividend
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Declare Dividend</DialogTitle>
              <DialogDescription>
                Declare a dividend payout for a period. This will create payout records for all eligible shareholders.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Period *</Label>
                <Input
                  placeholder="e.g. 2025-Q1"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Use format like 2025-Q1, 2025-H1, or 2025</p>
              </div>
              <div className="space-y-2">
                <Label>Label *</Label>
                <Input
                  placeholder="e.g. First Quarter 2025 Dividend"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Total Amount (MWK) *</Label>
                <Input
                  type="number"
                  placeholder="e.g. 500000"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Optional notes about this dividend..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeclareOpen(false)}>Cancel</Button>
              <Button onClick={handleDeclare} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Declare & Create Payouts
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Declarations List */}
      {declarations.length === 0 ? (
        <EmptyState
          icon={Gift}
          title="No dividends declared"
          description="Declare your first dividend to distribute profits to shareholders."
        />
      ) : (
        <div className="space-y-4">
          {declarations.map((d) => (
            <Card key={d.id} className="p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{d.label}</h4>
                    <StatusBadge status={d.status} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Period: {d.period} | Declared: {formatDate(d.declaredAt)}
                    {d.paidOutAt && ` | Paid out: ${formatDate(d.paidOutAt)}`}
                  </p>
                  <div className="flex gap-4 text-sm mt-2 flex-wrap">
                    <span><strong>Pool:</strong> {formatCurrency(d.totalAmount)}</span>
                    <span><strong>Rate:</strong> MK {d.ratePerShare.toFixed(2)}/share</span>
                    <span><strong>Eligible Shares:</strong> {d.eligibleShares.toLocaleString()}</span>
                    <span><strong>Members:</strong> {d._count.payouts}</span>
                    <span><strong>Paid:</strong> {d.paidCount} of {d._count.payouts}</span>
                  </div>
                  {d.notes && <p className="text-xs text-muted-foreground mt-1">{d.notes}</p>}
                </div>
                <div className="text-right space-y-2">
                  <p className="text-lg font-bold text-emerald-600">{formatCurrency(d.paidAmount)}</p>
                  <p className="text-xs text-muted-foreground">paid out</p>
                  {d.status === "DECLARED" && (
                    <Button
                      size="sm"
                      onClick={() => handlePayout(d.id)}
                      disabled={submitting}
                    >
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4 mr-1" />}
                      Process Payout
                    </Button>
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