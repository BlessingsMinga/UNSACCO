"use client";

import { useEffect, useState, useCallback } from "react";
import { api, ApiError } from "@/lib/api-client";
import { formatCurrency, formatDateTime, SAVINGS_INTEREST_RATE, MIN_SAVINGS_DEPOSIT } from "@/lib/constants";
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
  PiggyBank,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Minus,
  Loader2,
  Receipt,
  Percent,
  Filter,
} from "lucide-react";

type Summary = {
  balance: number;
  interestAccrued: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalInterest: number;
  transactionCount: number;
  lastTransaction: { createdAt: string; type: string; amount: number } | null;
  interestRate: number;
  monthlyDeposits: { label: string; total: number }[];
};

type Txn = {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string;
  reference: string;
  method: string;
  status: string;
  createdAt: string;
};

export function SavingsTab() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, t] = await Promise.all([
        api.get<Summary>("/api/savings/summary"),
        api.get<{ transactions: Txn[] }>(`/api/savings/transactions?limit=100`),
      ]);
      setSummary(s);
      setTxns(t.transactions);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to load savings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = filter === "ALL" ? txns : txns.filter((t) => t.type === filter);

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
          <h2 className="text-2xl font-bold tracking-tight">Savings</h2>
          <p className="text-sm text-muted-foreground">
            Earn {SAVINGS_INTEREST_RATE}% p.a. on your balance · Last activity{" "}
            {summary.lastTransaction ? formatDateTime(summary.lastTransaction.createdAt) : "—"}
          </p>
        </div>
        <div className="flex gap-2">
          <DepositDialog open={depositOpen} onOpenChange={setDepositOpen} onDone={load} balance={summary.balance} />
          <WithdrawDialog open={withdrawOpen} onOpenChange={setWithdrawOpen} onDone={load} balance={summary.balance} />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Current balance" value={formatCurrency(summary.balance)} icon={PiggyBank} accent="primary" />
        <StatCard label="Total deposits" value={formatCurrency(summary.totalDeposits)} icon={ArrowDownLeft} accent="gold" />
        <StatCard label="Total withdrawals" value={formatCurrency(summary.totalWithdrawals)} icon={ArrowUpRight} accent="rose" />
        <StatCard label="Interest earned" value={formatCurrency(summary.totalInterest)} icon={Percent} accent="violet" />
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Receipt className="size-5 text-muted-foreground" />
            <h3 className="font-semibold">Transaction ledger</h3>
            <span className="text-xs text-muted-foreground">({summary.transactionCount} total)</span>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-muted-foreground" />
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All types</SelectItem>
                <SelectItem value="DEPOSIT">Deposits</SelectItem>
                <SelectItem value="WITHDRAWAL">Withdrawals</SelectItem>
                <SelectItem value="INTEREST">Interest</SelectItem>
                <SelectItem value="ADJUSTMENT">Adjustments</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No transactions found"
            description="Make your first deposit to start your savings journey."
          />
        ) : (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground uppercase tracking-wide border-b border-border">
                  <th className="font-medium px-5 py-3">Date</th>
                  <th className="font-medium px-3 py-3">Type</th>
                  <th className="font-medium px-3 py-3">Description</th>
                  <th className="font-medium px-3 py-3">Reference</th>
                  <th className="font-medium px-3 py-3">Method</th>
                  <th className="font-medium px-3 py-3 text-right">Amount</th>
                  <th className="font-medium px-5 py-3 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => {
                  const positive = t.type === "DEPOSIT" || t.type === "INTEREST" || t.type === "DIVIDEND";
                  return (
                    <tr key={t.id} className="border-b border-border/50 last:border-0 hover:bg-muted/40 transition-colors">
                      <td className="px-5 py-3 whitespace-nowrap text-muted-foreground">{formatDateTime(t.createdAt)}</td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${positive ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
                          }`}>
                          {positive ? <ArrowDownLeft className="size-3" /> : <ArrowUpRight className="size-3" />}
                          {t.type}
                        </span>
                      </td>
                      <td className="px-3 py-3 max-w-[220px] truncate">{t.description}</td>
                      <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{t.reference}</td>
                      <td className="px-3 py-3 text-muted-foreground text-xs">{t.method}</td>
                      <td className={`px-3 py-3 text-right font-semibold tabular-nums ${positive ? "text-emerald-600" : "text-rose-600"}`}>
                        {positive ? "+" : "−"}{formatCurrency(t.amount)}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">{formatCurrency(t.balanceAfter)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="p-5 bg-muted/30">
        <h3 className="font-semibold mb-2">How savings interest works</h3>
        <p className="text-sm text-muted-foreground">
          Your savings earn <strong>{SAVINGS_INTEREST_RATE}% per annum</strong>, calculated on your minimum monthly balance
          and credited to your account periodically. The more consistently you save, the more you earn. Minimum deposit is{" "}
          {formatCurrency(MIN_SAVINGS_DEPOSIT)}.
        </p>
      </Card>
    </div>
  );
}

function DepositDialog({ open, onOpenChange, onDone, balance }: { open: boolean; onOpenChange: (v: boolean) => void; onDone: () => void; balance: number }) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("MOBILE_MONEY");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount.");
    if (amt < MIN_SAVINGS_DEPOSIT) return toast.error(`Minimum deposit is ${formatCurrency(MIN_SAVINGS_DEPOSIT)}.`);
    setLoading(true);
    try {
      const res = await api.post<{ checkout_url?: string; newBalance?: number; message?: string; reference?: string; status?: string }>("/api/savings/deposit", {
        amount: amt,
        method,
        description: description || undefined,
      });
      if (res.checkout_url) {
        // PayChangu Standard Checkout - open in new tab so user can return
        setAmount(""); setDescription("");
        onOpenChange(false);
        window.open(res.checkout_url, "_blank", "noopener,noreferrer");
        toast.success("Payment page opened in a new tab. Complete your payment there and return here to see the updated balance.", { duration: 6000 });
      } else if (res.message && res.status === "PENDING") {
        // PayChangu flow - user needs to authorize on phone
        toast.success(`Payment prompt sent to your phone. Check your mobile money app and enter your PIN to complete the deposit.`, { duration: 8000 });
        setAmount(""); setDescription("");
        onOpenChange(false);
        // Don't reload yet - webhook will update balance
        setTimeout(onDone, 5000);
      } else {
        toast.success(`Deposited ${formatCurrency(amt)}. New balance: ${formatCurrency(res.newBalance!)}.`);
        setAmount(""); setDescription("");
        onOpenChange(false);
        onDone();
      }
    } catch (e) {
      const errMsg = e instanceof ApiError ? e.message : "Deposit failed.";
      toast.error(errMsg);
      console.error("Deposit error:", errMsg, e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-1.5"><Plus className="size-4" /> Deposit</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Make a deposit</DialogTitle>
          <DialogDescription>Add funds to your savings account via mobile money, bank or cash.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="rounded-lg bg-muted/50 p-3 text-sm flex justify-between">
            <span className="text-muted-foreground">Current balance</span>
            <span className="font-semibold tabular-nums">{formatCurrency(balance)}</span>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dep-amount">Amount (MWK)</Label>
            <Input id="dep-amount" type="number" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 10000" />
          </div>
          <div className="space-y-1.5">
            <Label>Payment method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PAYCHANGU">PayChangu (Mobile Money / Card / Bank)</SelectItem>
                <SelectItem value="MOBILE_MONEY">Mobile Money (Other)</SelectItem>
                <SelectItem value="BANK">Bank Transfer</SelectItem>
                <SelectItem value="CASH">Cash</SelectItem>
              </SelectContent>
            </Select>
            {method === "PAYCHANGU" && (
              <p className="text-xs text-emerald-600">You will be redirected to PayChangu's secure checkout page to complete payment.</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dep-desc">Description (optional)</Label>
            <Input id="dep-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Monthly savings" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin mr-2" />} Confirm deposit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WithdrawDialog({ open, onOpenChange, onDone, balance }: { open: boolean; onOpenChange: (v: boolean) => void; onDone: () => void; balance: number }) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("MOBILE_MONEY");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount.");
    if (amt > balance) return toast.error("Amount exceeds your available balance.");
    setLoading(true);
    try {
      const res = await api.post<{ newBalance: number }>("/api/savings/withdraw", {
        amount: amt,
        method,
        description: description || undefined,
      });
      toast.success(`Withdrew ${formatCurrency(amt)}. New balance: ${formatCurrency(res.newBalance)}.`);
      setAmount(""); setDescription("");
      onOpenChange(false);
      onDone();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Withdrawal failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-1.5"><Minus className="size-4" /> Withdraw</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Withdraw savings</DialogTitle>
          <DialogDescription>Withdraw funds from your savings account.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="rounded-lg bg-muted/50 p-3 text-sm flex justify-between">
            <span className="text-muted-foreground">Available balance</span>
            <span className="font-semibold tabular-nums">{formatCurrency(balance)}</span>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wd-amount">Amount (MWK)</Label>
            <Input id="wd-amount" type="number" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 5000" />
          </div>
          <div className="space-y-1.5">
            <Label>Withdrawal method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PAYCHANGU">PayChangu (Receive via Mobile Money)</SelectItem>
                <SelectItem value="MOBILE_MONEY">Mobile Money</SelectItem>
                <SelectItem value="BANK">Bank Transfer</SelectItem>
                <SelectItem value="CASH">Cash</SelectItem>
              </SelectContent>
            </Select>
            {method === "PAYCHANGU" && (
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-200 p-3 text-xs space-y-1">
                <p className="font-medium text-emerald-700">How it works:</p>
                <ol className="list-decimal list-inside text-emerald-600 space-y-0.5">
                  <li>Enter the amount and confirm</li>
                  <li>Funds are sent directly to your mobile money wallet</li>
                  <li>Money arrives instantly — no bank delays</li>
                </ol>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wd-desc">Reason (optional)</Label>
            <Input id="wd-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Emergency withdrawal" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={submit} disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin mr-2" />} Confirm withdrawal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
