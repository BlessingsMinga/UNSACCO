"use client";

import { useEffect, useState, useCallback } from "react";
import { api, ApiError } from "@/lib/api-client";
import { formatCurrency, formatDateTime } from "@/lib/constants";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/unissaco/shared/empty-state";
import { toast } from "sonner";
import { Receipt, ArrowDownLeft, ArrowUpRight, Filter } from "lucide-react";

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
  user: { fullName: string | null; studentId: string | null; email: string };
};

export function AdminTransactionsTab() {
  const [txns, setTxns] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter !== "ALL" ? `?type=${filter}` : "";
      const res = await api.get<{ transactions: Txn[] }>(`/api/admin/transactions${params}`);
      setTxns(res.transactions);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to load transactions.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const totalDeposits = txns.filter((t) => t.type === "DEPOSIT").reduce((s, t) => s + t.amount, 0);
  const totalWithdrawals = txns.filter((t) => t.type === "WITHDRAWAL").reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">All Transactions</h2>
          <p className="text-sm text-muted-foreground">Complete savings ledger across all members</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
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

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total deposits (shown)</p>
          <p className="text-2xl font-bold text-emerald-600 tabular-nums">{formatCurrency(totalDeposits)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total withdrawals (shown)</p>
          <p className="text-2xl font-bold text-rose-600 tabular-nums">{formatCurrency(totalWithdrawals)}</p>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
          </div>
        ) : txns.length === 0 ? (
          <EmptyState icon={Receipt} title="No transactions found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground uppercase tracking-wide border-b border-border bg-muted/30">
                  <th className="font-medium px-5 py-3">Date</th>
                  <th className="font-medium px-3 py-3">Member</th>
                  <th className="font-medium px-3 py-3">Type</th>
                  <th className="font-medium px-3 py-3">Description</th>
                  <th className="font-medium px-3 py-3">Reference</th>
                  <th className="font-medium px-3 py-3 text-right">Amount</th>
                  <th className="font-medium px-5 py-3 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="max-h-[60vh] overflow-y-auto">
                {txns.map((t) => {
                  const positive = t.type === "DEPOSIT" || t.type === "INTEREST" || t.type === "DIVIDEND";
                  return (
                    <tr key={t.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                      <td className="px-5 py-3 whitespace-nowrap text-muted-foreground text-xs">{formatDateTime(t.createdAt)}</td>
                      <td className="px-3 py-3">
                        <p className="font-medium">{t.user.fullName}</p>
                        <p className="text-xs text-muted-foreground">{t.user.studentId}</p>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                          positive ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
                        }`}>
                          {positive ? <ArrowDownLeft className="size-3" /> : <ArrowUpRight className="size-3" />}
                          {t.type}
                        </span>
                      </td>
                      <td className="px-3 py-3 max-w-[200px] truncate text-muted-foreground">{t.description}</td>
                      <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{t.reference}</td>
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
    </div>
  );
}
