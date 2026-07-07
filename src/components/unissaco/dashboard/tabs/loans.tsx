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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatCard } from "@/components/unissaco/shared/stat-card";
import { EmptyState } from "@/components/unissaco/shared/empty-state";
import { StatusBadge } from "@/components/unissaco/shared/status-badge";
import { toast } from "sonner";
import {
  Landmark,
  HandCoins,
  CircleDollarSign,
  CalendarCheck,
  Loader2,
  Plus,
  ArrowRightLeft,
} from "lucide-react";

type LoanProduct = {
  id: string;
  name: string;
  description: string;
  minAmount: number;
  maxAmount: number;
  interestRate: number;
  repaymentPeriod: number;
  processingFee: number;
  requiresGuarantor: boolean;
  minGuarantors: number;
};

type LoanRepayment = {
  id: string;
  amount: number;
  principalPortion: number;
  interestPortion: number;
  balanceAfter: number;
  dueDate: string;
  paidDate: string | null;
  status: string;
  reference: string;
  createdAt: string;
};

type LoanGuarantor = {
  id: string;
  userId: string;
  amountGuaranteed: number;
  status: string;
  user: { fullName: string; email: string };
};

type Loan = {
  id: string;
  amountApplied: number;
  amountApproved: number | null;
  interestRate: number;
  repaymentPeriod: number;
  monthlyInstallment: number | null;
  totalRepayable: number | null;
  purpose: string;
  status: string;
  balance: number;
  applicationDate: string;
  approvedAt: string | null;
  disbursedAt: string | null;
  rejectionReason: string | null;
  closedAt: string | null;
  product: { name: string; interestRate: number; repaymentPeriod: number };
  repayments: LoanRepayment[];
  guarantors: LoanGuarantor[];
};

type Eligibility = {
  eligible: boolean;
  savingsBalance: number;
  shareCount: number;
  maxLoanAmount: number;
  hasMinimumSavings: boolean;
  hasMinimumShares: boolean;
  activeLoanCount: number;
  reason?: string;
};

export function LoansTab() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [products, setProducts] = useState<LoanProduct[]>([]);
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [loading, setLoading] = useState(true);
  const [applyOpen, setApplyOpen] = useState(false);
  const [repayOpen, setRepayOpen] = useState<string | null>(null);
  const [detailLoan, setDetailLoan] = useState<Loan | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Apply form
  const [selectedProduct, setSelectedProduct] = useState("");
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");

  // Repay form
  const [repayAmount, setRepayAmount] = useState("");
  const [repayMethod, setRepayMethod] = useState("PAYCHANGU");

  const fetchData = useCallback(async () => {
    try {
      const [loansRes, productsRes, eligRes] = await Promise.all([
        api.get<Loan[]>("/api/loans"),
        api.get<LoanProduct[]>("/api/loans/products"),
        api.get<Eligibility>("/api/loans/eligibility"),
      ]);
      setLoans(loansRes);
      setProducts(productsRes);
      setEligibility(eligRes);
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 401)) {
        toast.error("Failed to load loan data");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleApply = async () => {
    if (!selectedProduct || !amount || !purpose) {
      toast.error("Please fill in all fields");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/api/loans/apply", { productId: selectedProduct, amountApplied: Number(amount), purpose });
      toast.success("Loan application submitted!");
      setApplyOpen(false);
      setSelectedProduct("");
      setAmount("");
      setPurpose("");
      fetchData();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to apply");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRepay = async (loanId: string) => {
    if (!repayAmount || Number(repayAmount) <= 0) {
      toast.error("Enter a valid repayment amount");
      return;
    }
    setSubmitting(true);
    try {
      if (repayMethod === "PAYCHANGU") {
        // Use PayChangu Standard Checkout - redirect to hosted payment page
        const res = await api.post<{ checkout_url: string; tx_ref: string }>("/api/payments/initiate", {
          loanId,
          amount: Number(repayAmount),
        });
        setRepayOpen(null);
        setRepayAmount("");
        // Redirect user to PayChangu's hosted checkout page
        window.location.href = res.checkout_url;
      } else {
        // Deduct directly from savings
        await api.post(`/api/loans/${loanId}/repay`, { amount: Number(repayAmount), method: repayMethod });
        toast.success("Repayment successful! Amount deducted from your savings.");
        setRepayOpen(null);
        setRepayAmount("");
        fetchData();
      }
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Repayment failed");
    } finally {
      setSubmitting(false);
    }
  };

  const activeLoans = loans.filter((l) => ["PENDING", "APPROVED", "DISBURSED"].includes(l.status));
  const totalOutstanding = activeLoans.reduce((sum, l) => sum + l.balance, 0);
  const totalBorrowed = loans.reduce((sum, l) => sum + (l.amountApproved ?? l.amountApplied), 0);
  const totalRepaid = loans.reduce((sum, l) => sum + l.repayments.filter((r) => r.status === "PAID").reduce((s, r) => s + r.amount, 0), 0);

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
          label="Active Loans"
          value={activeLoans.length.toString()}
          icon={Landmark}
          hint={activeLoans.length === 1 ? "1 active loan" : `${activeLoans.length} active loans`}
        />
        <StatCard
          label="Outstanding Balance"
          value={formatCurrency(totalOutstanding)}
          icon={CircleDollarSign}
          trend={totalOutstanding > 0 ? { value: formatCurrency(totalOutstanding), positive: true } : { value: "MK 0", positive: false }}
        />
        <StatCard
          label="Total Borrowed"
          value={formatCurrency(totalBorrowed)}
          icon={HandCoins}
        />
        <StatCard
          label="Total Repaid"
          value={formatCurrency(totalRepaid)}
          icon={CalendarCheck}
        />
      </div>

      {/* Eligibility & Apply */}
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-lg font-semibold mb-1">Loan Eligibility</h3>
            {eligibility && (
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>Savings: {formatCurrency(eligibility.savingsBalance)} {eligibility.hasMinimumSavings ? "✅" : "❌"}</p>
                <p>Shares: {eligibility.shareCount} {eligibility.hasMinimumShares ? "✅" : "❌"}</p>
                {eligibility.eligible && (
                  <p className="text-emerald-600 font-medium">You can borrow up to {formatCurrency(eligibility.maxLoanAmount)}</p>
                )}
                {eligibility.reason && (
                  <p className="text-amber-600">{eligibility.reason}</p>
                )}
              </div>
            )}
          </div>
          <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
            <DialogTrigger asChild>
              <Button disabled={!eligibility?.eligible || products.length === 0}>
                <Plus className="mr-2 h-4 w-4" /> Apply for Loan
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Apply for a Loan</DialogTitle>
                <DialogDescription>Choose a loan product and enter the details.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Loan Product</Label>
                  <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} - {p.interestRate}% p.a. ({p.repaymentPeriod} months)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedProduct && (() => {
                  const prod = products.find((p) => p.id === selectedProduct);
                  if (!prod) return null;
                  return (
                    <div className="text-xs text-muted-foreground space-y-1 bg-muted p-3 rounded-lg">
                      <p>{prod.description}</p>
                      <p>Range: {formatCurrency(prod.minAmount)} - {formatCurrency(prod.maxAmount)}</p>
                      <p>Interest: {prod.interestRate}% p.a. | Period: {prod.repaymentPeriod} months</p>
                      {prod.requiresGuarantor && <p>Requires {prod.minGuarantors} guarantor(s)</p>}
                    </div>
                  );
                })()}
                <div className="space-y-2">
                  <Label>Amount (MWK)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 50000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Purpose</Label>
                  <Textarea
                    placeholder="Describe the purpose of this loan..."
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setApplyOpen(false)}>Cancel</Button>
                <Button onClick={handleApply} disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit Application
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </Card>

      {/* Loan List */}
      {loans.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title="No loans yet"
          description="Apply for your first loan to get started."
        />
      ) : (
        <div className="space-y-4">
          {loans.map((loan) => (
            <Card key={loan.id} className="p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{loan.product.name}</h4>
                    <StatusBadge status={loan.status} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Applied {formatDate(loan.applicationDate)} | {formatCurrency(loan.amountApplied)}
                    {loan.amountApproved && ` | Approved: ${formatCurrency(loan.amountApproved)}`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {loan.interestRate}% p.a. | {loan.repaymentPeriod} months
                    {loan.monthlyInstallment && ` | Installment: ${formatCurrency(loan.monthlyInstallment)}/mo`}
                  </p>
                  {loan.status === "DISBURSED" && (
                    <p className="text-sm font-medium text-emerald-600">
                      Outstanding: {formatCurrency(loan.balance)}
                    </p>
                  )}
                  {loan.status === "REJECTED" && loan.rejectionReason && (
                    <p className="text-sm text-red-600">Reason: {loan.rejectionReason}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setDetailLoan(detailLoan?.id === loan.id ? null : loan)}>
                    Details
                  </Button>
                  {loan.status === "DISBURSED" && loan.balance > 0 && (
                    <Dialog open={repayOpen === loan.id} onOpenChange={(o) => { setRepayOpen(o ? loan.id : null); setRepayAmount(""); }}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <ArrowRightLeft className="mr-1 h-4 w-4" /> Repay
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-sm">
                        <DialogHeader>
                          <DialogTitle>Repay Loan</DialogTitle>
                          <DialogDescription>
                            Outstanding: {formatCurrency(loan.balance)} | Monthly installment: {loan.monthlyInstallment ? formatCurrency(loan.monthlyInstallment) : "—"}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <Label>Amount (MWK)</Label>
                            <Input
                              type="number"
                              placeholder="Enter amount"
                              value={repayAmount}
                              onChange={(e) => setRepayAmount(e.target.value)}
                              max={loan.balance}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label>Payment method</Label>
                            <Select value={repayMethod} onValueChange={setRepayMethod}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="PAYCHANGU">PayChangu (Mobile Money / Card / Bank)</SelectItem>
                                <SelectItem value="MOBILE_MONEY">Mobile Money (Savings)</SelectItem>
                                <SelectItem value="BANK">Bank Transfer (Savings)</SelectItem>
                              </SelectContent>
                            </Select>
                            {repayMethod === "PAYCHANGU" && (
                              <div className="rounded-lg bg-emerald-500/10 border border-emerald-200 p-3 text-xs space-y-1">
                                <p className="font-medium text-emerald-700">How it works:</p>
                                <ol className="list-decimal list-inside text-emerald-600 space-y-0.5">
                                  <li>Enter the amount and click Pay Now</li>
                                  <li>You'll be redirected to PayChangu's secure checkout page</li>
                                  <li>Pay using Mobile Money, Card, or Bank Transfer</li>
                                  <li>You'll be redirected back once payment is complete</li>
                                </ol>
                              </div>
                            )}
                            {repayMethod !== "PAYCHANGU" && (
                              <p className="text-xs text-muted-foreground">Payment will be deducted from your savings balance.</p>
                            )}
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setRepayOpen(null)}>Cancel</Button>
                          <Button onClick={() => handleRepay(loan.id)} disabled={submitting}>
                            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Pay Now
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>

              {/* Expanded Details */}
              {detailLoan?.id === loan.id && (
                <div className="mt-4 pt-4 border-t space-y-4">
                  <p className="text-sm"><strong>Purpose:</strong> {loan.purpose}</p>

                  {/* Repayment History */}
                  {loan.repayments.length > 0 && (
                    <div>
                      <h5 className="text-sm font-semibold mb-2">Repayment History</h5>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-muted-foreground">
                              <th className="text-left py-1 pr-3">Date</th>
                              <th className="text-right pr-3">Amount</th>
                              <th className="text-right pr-3">Principal</th>
                              <th className="text-right pr-3">Balance</th>
                              <th className="text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {loan.repayments.map((r) => (
                              <tr key={r.id} className="border-b last:border-0">
                                <td className="py-1 pr-3">{formatDate(r.paidDate || r.dueDate)}</td>
                                <td className="text-right pr-3">{formatCurrency(r.amount)}</td>
                                <td className="text-right pr-3">{formatCurrency(r.principalPortion)}</td>
                                <td className="text-right pr-3">{formatCurrency(r.balanceAfter)}</td>
                                <td className="text-right"><StatusBadge status={r.status} /></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Guarantors */}
                  {loan.guarantors.length > 0 && (
                    <div>
                      <h5 className="text-sm font-semibold mb-2">Guarantors</h5>
                      <div className="space-y-2">
                        {loan.guarantors.map((g) => (
                          <div key={g.id} className="flex items-center justify-between text-sm bg-muted p-2 rounded-lg">
                            <span>{g.user.fullName} ({g.user.email})</span>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">{formatCurrency(g.amountGuaranteed)}</span>
                              <StatusBadge status={g.status} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}