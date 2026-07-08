"use client";

import { useEffect, useState, useCallback } from "react";
import { api, ApiError } from "@/lib/api-client";
import { formatCurrency, formatDateTime, SHARE_PRICE } from "@/lib/constants";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatCard } from "@/components/unissaco/shared/stat-card";
import { EmptyState } from "@/components/unissaco/shared/empty-state";
import { toast } from "sonner";
import {
  TrendingUp,
  Coins,
  Wallet,
  History,
  Plus,
  Loader2,
  ShieldCheck,
  Info,
} from "lucide-react";

type Summary = {
  numberOfShares: number;
  totalValue: number;
  sharePrice: number;
  totalBought: number;
  totalSold: number;
  lastTransaction: { createdAt: string } | null;
};

type Txn = {
  id: string;
  type: string;
  numberOfShares: number;
  pricePerShare: number;
  totalAmount: number;
  sharesAfter: number;
  reference: string;
  status: string;
  createdAt: string;
};

export function SharesTab() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [savingsBalance, setSavingsBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [buyOpen, setBuyOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, t, sav] = await Promise.all([
        api.get<Summary>("/api/shares/summary"),
        api.get<{ transactions: Txn[] }>("/api/shares/transactions?limit=100"),
        api.get<{ balance: number }>("/api/savings/summary"),
      ]);
      setSummary(s);
      setTxns(t.transactions);
      setSavingsBalance(sav.balance);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to load shares.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading || !summary) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Shares</h2>
          <p className="text-sm text-muted-foreground">
            Own a stake in your cooperative · {formatCurrency(SHARE_PRICE)} per share
          </p>
        </div>
        <BuySharesDialog open={buyOpen} onOpenChange={setBuyOpen} onDone={load} savingsBalance={savingsBalance} currentShares={summary.numberOfShares} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Shares held" value={summary.numberOfShares} icon={Coins} accent="primary" hint={formatCurrency(summary.totalValue)} />
        <StatCard label="Share value" value={formatCurrency(summary.totalValue)} icon={TrendingUp} accent="gold" hint={`@ ${formatCurrency(SHARE_PRICE)}/share`} />
        <StatCard label="Total bought" value={summary.totalBought} icon={Plus} accent="violet" hint="lifetime purchases" />
        <StatCard label="Savings available" value={formatCurrency(savingsBalance)} icon={Wallet} accent="sky" hint="for share purchase" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center gap-2 mb-4">
            <History className="size-5 text-muted-foreground" />
            <h3 className="font-semibold">Share ledger</h3>
          </div>
          {txns.length === 0 ? (
            <EmptyState icon={Coins} title="No share transactions yet" description="Buy your first shares to become a full voting member." />
          ) : (
            <div className="overflow-x-auto -mx-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground uppercase tracking-wide border-b border-border">
                    <th className="font-medium px-5 py-3">Date</th>
                    <th className="font-medium px-3 py-3">Type</th>
                    <th className="font-medium px-3 py-3 text-right">Shares</th>
                    <th className="font-medium px-3 py-3 text-right">Price</th>
                    <th className="font-medium px-3 py-3 text-right">Total</th>
                    <th className="font-medium px-3 py-3 text-right">After</th>
                    <th className="font-medium px-5 py-3">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {txns.map((t) => (
                    <tr key={t.id} className="border-b border-border/50 last:border-0 hover:bg-muted/40">
                      <td className="px-5 py-3 whitespace-nowrap text-muted-foreground">{formatDateTime(t.createdAt)}</td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold bg-primary/10 text-primary">
                          {t.type}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">{t.numberOfShares}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">{formatCurrency(t.pricePerShare)}</td>
                      <td className="px-3 py-3 text-right font-semibold tabular-nums">{formatCurrency(t.totalAmount)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{t.sharesAfter}</td>
                      <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{t.reference}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Info className="size-5 text-primary" />
            <h3 className="font-semibold">Why buy shares?</h3>
          </div>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>Shares represent your ownership stake in UNISSACO. The more shares you hold, the bigger your voice and your share of profits.</p>
            <div className="space-y-2">
              {[
                { icon: ShieldCheck, t: "Voting rights at AGM" },
                { icon: TrendingUp, t: "Dividend eligibility" },
                { icon: Wallet, t: "Loan access (min 10 shares)" },
              ].map((b) => (
                <div key={b.t} className="flex items-center gap-2.5">
                  <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <b.icon className="size-4 text-primary" />
                  </div>
                  <span className="text-foreground">{b.t}</span>
                </div>
              ))}
            </div>
            <div className="rounded-lg bg-muted/50 p-3 mt-3">
              <p className="text-xs">
                <strong className="text-foreground">Current price:</strong> {formatCurrency(SHARE_PRICE)} per share.
                Shares are purchased using your savings balance.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function BuySharesDialog({ open, onOpenChange, onDone, savingsBalance, currentShares }: { open: boolean; onOpenChange: (v: boolean) => void; onDone: () => void; savingsBalance: number; currentShares: number }) {
  const [qty, setQty] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("SAVINGS");
  const [loading, setLoading] = useState(false);
  const maxAffordable = Math.floor(savingsBalance / SHARE_PRICE);
  const cost = (Number(qty) || 0) * SHARE_PRICE;

  async function submit() {
    const n = Number(qty);
    if (!n || n < 1) return toast.error("Enter at least 1 share.");
    if (paymentMethod === "SAVINGS" && cost > savingsBalance) {
      return toast.error(`Insufficient savings. You need ${formatCurrency(cost)} but have ${formatCurrency(savingsBalance)}.`);
    }
    setLoading(true);
    try {
      const res = await api.post<{ checkout_url?: string; numberOfShares: number; savingsBalance: number; message?: string; status?: string }>("/api/shares/buy", {
        numberOfShares: n,
        paymentMethod,
      });

      if (res.checkout_url) {
        // PayChangu Standard Checkout - open in new tab so user can return
        window.open(res.checkout_url, "_blank", "noopener,noreferrer");
        toast.success("Payment page opened in a new tab. Complete your payment there.", { duration: 6000 });
      } else if (res.message && res.status === "PENDING") {
        // PayChangu flow
        toast.success(`Payment prompt sent to your phone. Check your mobile money app and enter your PIN to complete the purchase.`, { duration: 8000 });
      } else {
        toast.success(`Bought ${n} share(s) for ${formatCurrency(cost)}. You now hold ${res.numberOfShares} shares.`);
      }
      setQty("");
      onOpenChange(false);
      setTimeout(onDone, 3000);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Purchase failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-1.5"><Plus className="size-4" /> Buy shares</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Buy shares</DialogTitle>
          <DialogDescription>Shares are {formatCurrency(SHARE_PRICE)} each. Choose a payment method below.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Savings available</p>
              <p className="font-semibold tabular-nums">{formatCurrency(savingsBalance)}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Current shares</p>
              <p className="font-semibold tabular-nums">{currentShares}</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Payment method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PAYCHANGU">PayChangu Mobile Money (Mpamba/Airtel)</SelectItem>
                <SelectItem value="SAVINGS">Savings Account</SelectItem>
              </SelectContent>
            </Select>
            {paymentMethod === "PAYCHANGU" && (
              <p className="text-xs text-emerald-600">You will be redirected to PayChangu's secure checkout page to pay.</p>
            )}
            {paymentMethod === "SAVINGS" && (
              <p className="text-xs text-muted-foreground">Max affordable from savings: {maxAffordable} shares ({formatCurrency(maxAffordable * SHARE_PRICE)})</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qty">Number of shares</Label>
            <Input id="qty" type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} placeholder="e.g. 5" />
            {Number(qty) > 0 && (
              <div className="flex items-center justify-between rounded-lg bg-primary/5 border border-primary/20 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Total cost</span>
                <span className="font-semibold tabular-nums">{formatCurrency(cost)}</span>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={loading || !qty || (paymentMethod === "SAVINGS" && cost > savingsBalance)}>
            {loading && <Loader2 className="size-4 animate-spin mr-2" />} Buy {qty || ""} share{Number(qty) === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
