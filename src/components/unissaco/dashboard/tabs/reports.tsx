"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import { formatCurrency, formatDateTime, SHARE_PRICE } from "@/lib/constants";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BrandLogo } from "@/components/unissaco/brand-logo";
import { EmptyState } from "@/components/unissaco/shared/empty-state";
import { toast } from "sonner";
import {
  FileText,
  Printer,
  Copy,
  Download,
  ArrowDownLeft,
  ArrowUpRight,
  Info,
  Table,
} from "lucide-react";

type Statement = {
  statement: {
    member: { name: string | null; studentId: string | null; email: string };
    asOf: string;
    summary: { savingsBalance: number; numberOfShares: number; shareValue: number; netWorth: number };
    savingsTransactions: { id: string; type: string; amount: number; balanceAfter: number; description: string; reference: string; createdAt: string }[];
    shareTransactions: { id: string; type: string; numberOfShares: number; totalAmount: number; reference: string; createdAt: string }[];
    investments: { name: string; category: string; status: string; contributed: number; sharePct: number; expectedReturn: number; actualReturn: number }[];
  };
  printable: string;
};

export function ReportsTab() {
  const [data, setData] = useState<Statement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await api.get<Statement>("/api/reports/statement");
        setData(res);
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : "Failed to load statement.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[600px]" />
      </div>
    );
  }

  const { statement, printable } = data;

  function copyText() {
    navigator.clipboard.writeText(printable).then(
      () => toast.success("Statement copied to clipboard."),
      () => toast.error("Couldn't copy. Try downloading instead.")
    );
  }

  function downloadTxt() {
    const blob = new Blob([printable], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `unissaco-statement-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Statement downloaded.");
  }

  function downloadCsv() {
    window.open("/api/reports/export", "_blank");
    toast.success("CSV download started.");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 no-print">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Reports & Statements</h2>
          <p className="text-sm text-muted-foreground">Your complete financial statement · Generated {formatDateTime(statement.asOf)}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={copyText} className="gap-1.5"><Copy className="size-4" /> Copy</Button>
          <Button variant="outline" size="sm" onClick={downloadTxt} className="gap-1.5"><Download className="size-4" /> .txt</Button>
          <Button variant="outline" size="sm" onClick={downloadCsv} className="gap-1.5"><Table className="size-4" /> CSV</Button>
          <Button size="sm" onClick={() => window.print()} className="gap-1.5"><Printer className="size-4" /> Print / PDF</Button>
        </div>
      </div>

      {/* Statement document */}
      <Card className="p-6 sm:p-8 max-w-3xl mx-auto">
        {/* Letterhead */}
        <div className="flex items-start justify-between border-b border-border pb-5 mb-5">
          <div className="flex items-center gap-3">
            <BrandLogo size={44} />
            <div>
              <p className="font-bold text-lg leading-none">UNISSACO</p>
              <p className="text-xs text-muted-foreground mt-0.5">University Student Savings & Investment Cooperative</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Member Statement</p>
            <p className="text-xs text-muted-foreground">{formatDateTime(statement.asOf)}</p>
          </div>
        </div>

        {/* Member + summary */}
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          <div className="rounded-lg bg-muted/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Member</p>
            <p className="font-semibold">{statement.member.name ?? "—"}</p>
            <p className="text-sm text-muted-foreground">{statement.member.email}</p>
            <p className="text-sm text-muted-foreground">Student ID: {statement.member.studentId ?? "—"}</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Financial Summary</p>
            <div className="space-y-1 text-sm">
              <Row label="Savings balance" value={formatCurrency(statement.summary.savingsBalance)} />
              <Row label={`Shares (${statement.summary.numberOfShares} × ${formatCurrency(SHARE_PRICE)})`} value={formatCurrency(statement.summary.shareValue)} />
              <div className="border-t border-border mt-1 pt-1">
                <Row label="Net worth" value={formatCurrency(statement.summary.netWorth)} bold />
              </div>
            </div>
          </div>
        </div>

        {/* Savings transactions */}
        <SectionTitle title="Savings Transactions" count={statement.savingsTransactions.length} />
        {statement.savingsTransactions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-3">No savings transactions.</p>
        ) : (
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground uppercase border-b border-border">
                  <th className="font-medium py-2">Date</th>
                  <th className="font-medium py-2">Type</th>
                  <th className="font-medium py-2">Description</th>
                  <th className="font-medium py-2 text-right">Amount</th>
                  <th className="font-medium py-2 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {statement.savingsTransactions.slice(0, 25).map((t) => {
                  const positive = t.type === "DEPOSIT" || t.type === "INTEREST" || t.type === "DIVIDEND";
                  return (
                    <tr key={t.id} className="border-b border-border/40 last:border-0">
                      <td className="py-2 text-muted-foreground whitespace-nowrap text-xs">{formatDateTime(t.createdAt)}</td>
                      <td className="py-2">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold ${positive ? "text-emerald-600" : "text-rose-600"}`}>
                          {positive ? <ArrowDownLeft className="size-3" /> : <ArrowUpRight className="size-3" />}{t.type}
                        </span>
                      </td>
                      <td className="py-2 max-w-[200px] truncate">{t.description}</td>
                      <td className={`py-2 text-right tabular-nums font-medium ${positive ? "text-emerald-600" : "text-rose-600"}`}>
                        {positive ? "+" : "−"}{formatCurrency(t.amount)}
                      </td>
                      <td className="py-2 text-right tabular-nums text-muted-foreground">{formatCurrency(t.balanceAfter)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Share transactions */}
        <SectionTitle title="Share Transactions" count={statement.shareTransactions.length} />
        {statement.shareTransactions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-3">No share transactions.</p>
        ) : (
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground uppercase border-b border-border">
                  <th className="font-medium py-2">Date</th>
                  <th className="font-medium py-2">Type</th>
                  <th className="font-medium py-2 text-right">Shares</th>
                  <th className="font-medium py-2 text-right">Amount</th>
                  <th className="font-medium py-2">Reference</th>
                </tr>
              </thead>
              <tbody>
                {statement.shareTransactions.slice(0, 25).map((t) => (
                  <tr key={t.id} className="border-b border-border/40 last:border-0">
                    <td className="py-2 text-muted-foreground whitespace-nowrap text-xs">{formatDateTime(t.createdAt)}</td>
                    <td className="py-2"><span className="text-xs font-semibold text-primary">{t.type}</span></td>
                    <td className="py-2 text-right tabular-nums">{t.numberOfShares}</td>
                    <td className="py-2 text-right tabular-nums font-medium">{formatCurrency(t.totalAmount)}</td>
                    <td className="py-2 font-mono text-xs text-muted-foreground">{t.reference}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Investments */}
        <SectionTitle title="Investment Portfolio" count={statement.investments.length} />
        {statement.investments.length === 0 ? (
          <p className="text-sm text-muted-foreground py-3">No investments.</p>
        ) : (
          <div className="space-y-2 mb-6">
            {statement.investments.map((inv, i) => (
              <div key={i} className="flex items-center justify-between text-sm py-2 border-b border-border/40 last:border-0">
                <div>
                  <p className="font-medium">{inv.name}</p>
                  <p className="text-xs text-muted-foreground">{inv.category.replace("_", " ").toLowerCase()} · {inv.status}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium tabular-nums">{formatCurrency(inv.contributed)}</p>
                  <p className="text-xs text-emerald-600">Return: {formatCurrency(inv.actualReturn)}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-border pt-4 text-xs text-muted-foreground flex items-start gap-2">
          <Info className="size-4 shrink-0 mt-0.5" />
          <p>This statement is system-generated and reflects all transactions recorded up to {formatDateTime(statement.asOf)}. For disputes, contact the UNISSACO administrator within 30 days.</p>
        </div>
      </Card>

      {statement.savingsTransactions.length === 0 && statement.shareTransactions.length === 0 && (
        <Card className="p-6">
          <EmptyState icon={FileText} title="No transactions to report yet" description="Once you start saving and buying shares, your full statement will appear here." />
        </Card>
      )}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`tabular-nums ${bold ? "font-bold" : "font-medium"}`}>{value}</span>
    </div>
  );
}

function SectionTitle({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">{title}</h3>
      <span className="text-xs text-muted-foreground">({count})</span>
    </div>
  );
}