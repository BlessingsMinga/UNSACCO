"use client";

import { useEffect, useState, useCallback } from "react";
import { api, ApiError } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/constants";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/unissaco/shared/status-badge";
import { EmptyState } from "@/components/unissaco/shared/empty-state";
import { toast } from "sonner";
import {
  Users,
  Search,
  CheckCircle2,
  Ban,
  PlayCircle,
  XCircle,
  Eye,
  Loader2,
} from "lucide-react";

type Member = {
  id: string;
  fullName: string | null;
  email: string;
  studentId: string | null;
  phone: string | null;
  program: string | null;
  yearOfStudy: string | null;
  role: string;
  status: string;
  joinedAt: string;
  approvedAt: string | null;
  createdAt: string;
  savingsBalance: number;
  numberOfShares: number;
};

type MemberDetail = Member & {
  gender: string | null;
  address: string | null;
  nextOfKin: string | null;
  nextOfKinPhone: string | null;
  savingsAccount: { id: string; balance: number } | null;
  shareHoldings: { id: string; numberOfShares: number } | null;
  savingsTxns: { id: string; type: string; amount: number; createdAt: string; description: string }[];
  shareTxns: { id: string; type: string; numberOfShares: number; totalAmount: number; createdAt: string }[];
};

export function AdminMembersTab() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<MemberDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status !== "ALL") params.set("status", status);
      if (search) params.set("q", search);
      const res = await api.get<{ members: Member[] }>(`/api/admin/members?${params.toString()}`);
      setMembers(res.members);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to load members.");
    } finally {
      setLoading(false);
    }
  }, [status, search]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function openDetail(m: Member) {
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await api.get<MemberDetail>(`/api/admin/members/${m.id}`);
      setDetail(res);
    } catch (e) {
      toast.error("Failed to load member details.");
    } finally {
      setDetailLoading(false);
    }
  }

  async function updateStatus(memberId: string, newStatus: string) {
    setActionLoading(memberId + newStatus);
    try {
      await api.patch(`/api/admin/members/${memberId}`, { status: newStatus });
      toast.success(`Member status updated to ${newStatus}.`);
      // refresh lists
      await load();
      if (detail?.id === memberId) {
        setDetail({ ...detail, status: newStatus });
      }
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Update failed.");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Member Management</h2>
        <p className="text-sm text-muted-foreground">Approve, suspend and manage cooperative members</p>
      </div>

      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search by name, email or student ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="SUSPENDED">Suspended</SelectItem>
              <SelectItem value="CLOSED">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
          </div>
        ) : members.length === 0 ? (
          <EmptyState icon={Users} title="No members found" description="Try adjusting your search or filter." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground uppercase tracking-wide border-b border-border bg-muted/30">
                  <th className="font-medium px-5 py-3">Member</th>
                  <th className="font-medium px-3 py-3">Student ID</th>
                  <th className="font-medium px-3 py-3">Program</th>
                  <th className="font-medium px-3 py-3">Status</th>
                  <th className="font-medium px-3 py-3 text-right">Savings</th>
                  <th className="font-medium px-3 py-3 text-right">Shares</th>
                  <th className="font-medium px-3 py-3">Joined</th>
                  <th className="font-medium px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-full brand-gradient flex items-center justify-center text-white text-xs font-semibold shrink-0">
                          {(m.fullName ?? "?").split(" ").map((p) => p[0]).slice(0, 2).join("")}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{m.fullName}</p>
                          <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs">{m.studentId}</td>
                    <td className="px-3 py-3 text-muted-foreground text-xs max-w-[160px] truncate">{m.program}</td>
                    <td className="px-3 py-3"><StatusBadge status={m.status} /></td>
                    <td className="px-3 py-3 text-right tabular-nums">{formatCurrency(m.savingsBalance)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{m.numberOfShares}</td>
                    <td className="px-3 py-3 text-muted-foreground text-xs whitespace-nowrap">{formatDate(m.joinedAt)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openDetail(m)}>
                          <Eye className="size-4" />
                        </Button>
                        {m.status === "PENDING" && (
                          <Button
                            size="sm"
                            className="h-8 gap-1 bg-emerald-600 hover:bg-emerald-700"
                            disabled={actionLoading === m.id + "ACTIVE"}
                            onClick={() => updateStatus(m.id, "ACTIVE")}
                          >
                            {actionLoading === m.id + "ACTIVE" ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                            Approve
                          </Button>
                        )}
                        {m.status === "ACTIVE" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1 text-amber-600 border-amber-300 hover:bg-amber-50"
                            disabled={actionLoading === m.id + "SUSPENDED"}
                            onClick={() => updateStatus(m.id, "SUSPENDED")}
                          >
                            {actionLoading === m.id + "SUSPENDED" ? <Loader2 className="size-3.5 animate-spin" /> : <Ban className="size-3.5" />}
                            Suspend
                          </Button>
                        )}
                        {m.status === "SUSPENDED" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1 text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                            disabled={actionLoading === m.id + "ACTIVE"}
                            onClick={() => updateStatus(m.id, "ACTIVE")}
                          >
                            {actionLoading === m.id + "ACTIVE" ? <Loader2 className="size-3.5 animate-spin" /> : <PlayCircle className="size-3.5" />}
                            Reactivate
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Member detail dialog */}
      <Dialog open={!!detail || detailLoading} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {detailLoading ? (
            <div className="py-12 flex justify-center"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>
          ) : detail ? (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="size-12 rounded-full brand-gradient flex items-center justify-center text-white font-semibold">
                    {(detail.fullName ?? "?").split(" ").map((p) => p[0]).slice(0, 2).join("")}
                  </div>
                  <div>
                    <DialogTitle>{detail.fullName}</DialogTitle>
                    <DialogDescription>{detail.email}</DialogDescription>
                  </div>
                  <div className="ml-auto"><StatusBadge status={detail.status} /></div>
                </div>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <Info label="Student ID" value={detail.studentId ?? "—"} />
                <Info label="Phone" value={detail.phone ?? "—"} />
                <Info label="Program" value={detail.program ?? "—"} />
                <Info label="Year" value={detail.yearOfStudy ?? "—"} />
                <Info label="Joined" value={formatDate(detail.joinedAt)} />
                <Info label="Approved" value={detail.approvedAt ? formatDate(detail.approvedAt) : "Pending"} />
                <Info label="Savings balance" value={formatCurrency(detail.savingsBalance)} />
                <Info label="Shares" value={`${detail.numberOfShares} shares`} />
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {detail.status === "PENDING" && (
                  <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700" onClick={() => updateStatus(detail.id, "ACTIVE")}>
                    <CheckCircle2 className="size-4" /> Approve member
                  </Button>
                )}
                {detail.status === "ACTIVE" && (
                  <Button size="sm" variant="outline" className="gap-1.5 text-amber-600 border-amber-300" onClick={() => updateStatus(detail.id, "SUSPENDED")}>
                    <Ban className="size-4" /> Suspend
                  </Button>
                )}
                {detail.status === "SUSPENDED" && (
                  <Button size="sm" variant="outline" className="gap-1.5 text-emerald-600 border-emerald-300" onClick={() => updateStatus(detail.id, "ACTIVE")}>
                    <PlayCircle className="size-4" /> Reactivate
                  </Button>
                )}
                {detail.status !== "CLOSED" && (
                  <Button size="sm" variant="outline" className="gap-1.5 text-rose-600 border-rose-300" onClick={() => updateStatus(detail.id, "CLOSED")}>
                    <XCircle className="size-4" /> Close account
                  </Button>
                )}
              </div>

              {detail.savingsTxns.length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-2">Recent savings ({detail.savingsTxns.length})</p>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {detail.savingsTxns.slice(0, 8).map((t) => (
                      <div key={t.id} className="flex justify-between text-xs py-1.5 border-b border-border/40 last:border-0">
                        <span className="text-muted-foreground">{formatDate(t.createdAt)} · {t.type}</span>
                        <span className="font-medium tabular-nums">{formatCurrency(t.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/40 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold mt-0.5 truncate">{value}</p>
    </div>
  );
}
