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
  CircleDollarSign,
  Clock,
  Ban,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  Banknote,
  User,
  ChevronDown,
  ChevronUp,
  Filter,
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
  status: string;
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
  userId: string;
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
  user: { id: string; fullName: string | null; email: string; studentId: string | null; phone: string | null };
  product: { name: string; interestRate: number; repaymentPeriod: number };
  repayments: { id: string; amount: number; status: string; paidDate: string | null; dueDate: string }[];
  guarantors: LoanGuarantor[];
};

type LoanStats = {
  pending: number;
  active: number;
  total: number;
  totalRepaid: number;
};

export function AdminLoansTab() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [products, setProducts] = useState<LoanProduct[]>([]);
  const [stats, setStats] = useState<LoanStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [expandedLoan, setExpandedLoan] = useState<string | null>(null);
  const [actionLoan, setActionLoan] = useState<Loan | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | "disburse" | null>(null);
  const [approveAmount, setApproveAmount] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    minAmount: "0",
    maxAmount: "200000",
    interestRate: "15",
    repaymentPeriod: "12",
    processingFee: "2",
    latePaymentPenalty: "3",
    requiresGuarantor: false,
    minGuarantors: "0",
  });

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== "ALL") params.set("status", statusFilter);
      if (search) params.set("search", search);
      const query = params.toString() ? `?${params.toString()}` : "";

      const [loansRes, statsRes] = await Promise.all([
        api.get<{ loans: Loan[] }>(`/api/admin/loans${query}`),
        api.get<LoanStats>("/api/admin/loans?summary=true").catch(() => null),
      ]);
      setLoans(loansRes.loans);
      if (statsRes) setStats(statsRes);
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 401)) {
        toast.error("Failed to load loans");
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fetchProducts = useCallback(async () => {
    try {
      // Admin can see all products
      const res = await api.get<LoanProduct[]>("/api/loans/products");
      setProducts(res);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleLoanAction = async () => {
    if (!actionLoan || !actionType) return;
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = { loanId: actionLoan.id, action: actionType };
      if (actionType === "approve" && approveAmount) body.amountApproved = Number(approveAmount);
      if (actionType === "reject") body.rejectionReason = rejectReason || "Declined by administration";

      await api.patch("/api/admin/loans", body);
      toast.success(`Loan ${actionType}d successfully!`);
      setActionLoan(null);
      setActionType(null);
      setApproveAmount("");
      setRejectReason("");
      fetchData();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Action failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateProduct = async () => {
    setSubmitting(true);
    try {
      await api.post("/api/loans/products", {
        name: productForm.name,
        description: productForm.description,
        minAmount: Number(productForm.minAmount),
        maxAmount: Number(productForm.maxAmount),
        interestRate: Number(productForm.interestRate),
        repaymentPeriod: Number(productForm.repaymentPeriod),
        processingFee: Number(productForm.processingFee),
        latePaymentPenalty: Number(productForm.latePaymentPenalty),
        requiresGuarantor: productForm.requiresGuarantor,
        minGuarantors: Number(productForm.minGuarantors),
      });
      toast.success("Loan product created!");
      setProductDialogOpen(false);
      setProductForm({ name: "", description: "", minAmount: "0", maxAmount: "200000", interestRate: "15", repaymentPeriod: "12", processingFee: "2", latePaymentPenalty: "3", requiresGuarantor: false, minGuarantors: "0" });
      fetchProducts();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to create product");
    } finally {
      setSubmitting(false);
    }
  };

  const pendingCount = loans.filter((l) => l.status === "PENDING").length;
  const activeCount = loans.filter((l) => l.status === "DISBURSED").length;
  const totalOutstanding = loans.filter((l) => l.status === "DISBURSED").reduce((s, l) => s + l.balance, 0);

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
        <StatCard label="Pending Approval" value={pendingCount.toString()} icon={Clock} accent="sky" />
        <StatCard label="Active Loans" value={activeCount.toString()} icon={Landmark} accent="primary" />
        <StatCard label="Outstanding" value={formatCurrency(totalOutstanding)} icon={CircleDollarSign} accent="gold" />
        <StatCard label="Total Applications" value={loans.length.toString()} icon={User} accent="violet" />
      </div>

      {/* Actions Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email or student ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="DISBURSED">Disbursed</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
            <SelectItem value="DEFAULTED">Defaulted</SelectItem>
          </SelectContent>
        </Select>
        <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">+ New Product</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Loan Product</DialogTitle>
              <DialogDescription>Define a new loan product for members.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Product Name</Label>
                <Input value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} placeholder="e.g. Student Loan" />
              </div>
              <div className="space-y-1">
                <Label>Description</Label>
                <Textarea value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Min Amount</Label>
                  <Input type="number" value={productForm.minAmount} onChange={(e) => setProductForm({ ...productForm, minAmount: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Max Amount</Label>
                  <Input type="number" value={productForm.maxAmount} onChange={(e) => setProductForm({ ...productForm, maxAmount: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Interest Rate (% p.a.)</Label>
                  <Input type="number" value={productForm.interestRate} onChange={(e) => setProductForm({ ...productForm, interestRate: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Period (months)</Label>
                  <Input type="number" value={productForm.repaymentPeriod} onChange={(e) => setProductForm({ ...productForm, repaymentPeriod: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Processing Fee (%)</Label>
                  <Input type="number" value={productForm.processingFee} onChange={(e) => setProductForm({ ...productForm, processingFee: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Late Penalty (%/mo)</Label>
                  <Input type="number" value={productForm.latePaymentPenalty} onChange={(e) => setProductForm({ ...productForm, latePaymentPenalty: e.target.value })} />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="requiresGuarantor"
                  checked={productForm.requiresGuarantor}
                  onChange={(e) => setProductForm({ ...productForm, requiresGuarantor: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="requiresGuarantor">Requires Guarantor</Label>
                {productForm.requiresGuarantor && (
                  <div className="w-20">
                    <Input
                      type="number"
                      value={productForm.minGuarantors}
                      onChange={(e) => setProductForm({ ...productForm, minGuarantors: e.target.value })}
                      placeholder="Min"
                    />
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setProductDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateProduct} disabled={submitting || !productForm.name}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Product
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Existing Products */}
      {products.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {products.map((p) => (
            <span key={p.id} className="text-xs bg-muted px-2 py-1 rounded-md">
              {p.name}: {p.interestRate}%, {formatCurrency(p.minAmount)}-{formatCurrency(p.maxAmount)}
            </span>
          ))}
        </div>
      )}

      {/* Loans Table */}
      {loans.length === 0 ? (
        <EmptyState icon={Landmark} title="No loans found" description="No loan applications match your filters." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left py-3 pr-3">Member</th>
                <th className="text-left pr-3">Product</th>
                <th className="text-right pr-3">Amount</th>
                <th className="text-right pr-3">Balance</th>
                <th className="text-center pr-3">Status</th>
                <th className="text-right pr-3">Date</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loans.map((loan) => (
                <>
                  <tr key={loan.id} className="border-b hover:bg-muted/50 cursor-pointer" onClick={() => setExpandedLoan(expandedLoan === loan.id ? null : loan.id)}>
                    <td className="py-3 pr-3">
                      <div className="font-medium">{loan.user.fullName || "—"}</div>
                      <div className="text-xs text-muted-foreground">{loan.user.email}</div>
                    </td>
                    <td className="pr-3">{loan.product.name}</td>
                    <td className="text-right pr-3">{formatCurrency(loan.amountApproved ?? loan.amountApplied)}</td>
                    <td className="text-right pr-3">{formatCurrency(loan.balance)}</td>
                    <td className="text-center pr-3"><StatusBadge status={loan.status} /></td>
                    <td className="text-right pr-3 text-muted-foreground">{formatDate(loan.applicationDate)}</td>
                    <td className="text-right">
                      <div className="flex gap-1 justify-end">
                        {loan.status === "PENDING" && (
                          <>
                            <Button size="sm" variant="outline" className="h-8 text-emerald-600 border-emerald-200"
                              onClick={(e) => { e.stopPropagation(); setActionLoan(loan); setActionType("approve"); setApproveAmount(String(loan.amountApplied)); }}>
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 text-red-600 border-red-200"
                              onClick={(e) => { e.stopPropagation(); setActionLoan(loan); setActionType("reject"); }}>
                              <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                            </Button>
                          </>
                        )}
                        {loan.status === "APPROVED" && (
                          <Button size="sm" className="h-8"
                            onClick={(e) => { e.stopPropagation(); setActionLoan(loan); setActionType("disburse"); }}>
                            <Banknote className="h-3.5 w-3.5 mr-1" /> Disburse
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandedLoan === loan.id && (
                    <tr key={`${loan.id}-detail`}>
                      <td colSpan={7} className="py-4 px-4 bg-muted/30">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <h5 className="text-sm font-semibold mb-2">Loan Details</h5>
                            <div className="text-xs space-y-1 text-muted-foreground">
                              <p>Purpose: {loan.purpose}</p>
                              <p>Interest: {loan.interestRate}% p.a. | Period: {loan.repaymentPeriod} months</p>
                              {loan.monthlyInstallment && <p>Monthly Installment: {formatCurrency(loan.monthlyInstallment)}</p>}
                              {loan.totalRepayable && <p>Total Repayable: {formatCurrency(loan.totalRepayable)}</p>}
                              {loan.approvedAt && <p>Approved: {formatDateTime(loan.approvedAt)}</p>}
                              {loan.disbursedAt && <p>Disbursed: {formatDateTime(loan.disbursedAt)}</p>}
                              {loan.rejectionReason && <p className="text-red-600">Rejection: {loan.rejectionReason}</p>}
                            </div>
                          </div>
                          <div>
                            <h5 className="text-sm font-semibold mb-2">Member Info</h5>
                            <div className="text-xs space-y-1 text-muted-foreground">
                              <p>Student ID: {loan.user.studentId || "—"}</p>
                              <p>Phone: {loan.user.phone || "—"}</p>
                              <p>Email: {loan.user.email}</p>
                            </div>
                            {loan.guarantors.length > 0 && (
                              <div className="mt-3">
                                <h5 className="text-sm font-semibold mb-1">Guarantors</h5>
                                {loan.guarantors.map((g) => (
                                  <div key={g.id} className="text-xs flex items-center gap-2 text-muted-foreground">
                                    <span>{g.user.fullName}</span>
                                    <StatusBadge status={g.status} />
                                    <span>{formatCurrency(g.amountGuaranteed)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {loan.repayments.length > 0 && (
                              <div className="mt-3">
                                <h5 className="text-sm font-semibold mb-1">Repayments</h5>
                                {loan.repayments.map((r) => (
                                  <div key={r.id} className="text-xs flex items-center gap-2 text-muted-foreground">
                                    <span>{formatDate(r.paidDate || r.dueDate)}</span>
                                    <span>{formatCurrency(r.amount)}</span>
                                    <StatusBadge status={r.status} />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Action Confirmation Dialog */}
      <Dialog open={!!actionLoan} onOpenChange={(o) => { if (!o) { setActionLoan(null); setActionType(null); setApproveAmount(""); setRejectReason(""); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" && "Approve Loan"}
              {actionType === "reject" && "Reject Loan"}
              {actionType === "disburse" && "Disburse Loan"}
            </DialogTitle>
            <DialogDescription>
              {actionLoan && `${actionLoan.user.fullName} — ${actionLoan.product.name} — ${formatCurrency(actionLoan.amountApplied)}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {actionType === "approve" && (
              <div className="space-y-2">
                <Label>Approved Amount (MWK)</Label>
                <Input type="number" value={approveAmount} onChange={(e) => setApproveAmount(e.target.value)} />
              </div>
            )}
            {actionType === "reject" && (
              <div className="space-y-2">
                <Label>Reason for Rejection</Label>
                <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={2} placeholder="Optional reason..." />
              </div>
            )}
            {actionType === "disburse" && (
              <p className="text-sm text-muted-foreground">
                This will disburse {formatCurrency(actionLoan?.amountApproved ?? 0)} to the member's savings account.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setActionLoan(null); setActionType(null); }}>Cancel</Button>
            <Button
              onClick={handleLoanAction}
              disabled={submitting}
              variant={actionType === "reject" ? "destructive" : "default"}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm {actionType === "approve" ? "Approval" : actionType === "reject" ? "Rejection" : "Disbursement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}