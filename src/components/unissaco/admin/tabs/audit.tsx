"use client";

import { useEffect, useState, useCallback } from "react";
import { api, ApiError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/constants";
import { Card } from "@/components/ui/card";
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
import { ShieldCheck, Filter, Activity } from "lucide-react";

type Log = {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: string;
  ipAddress: string | null;
  createdAt: string;
  user: { fullName: string | null; email: string } | null;
};

const ACTION_COLORS: Record<string, string> = {
  LOGIN: "bg-sky-500/10 text-sky-600",
  LOGOUT: "bg-zinc-500/10 text-zinc-600",
  REGISTER: "bg-emerald-500/10 text-emerald-600",
  DEPOSIT: "bg-emerald-500/10 text-emerald-600",
  WITHDRAWAL: "bg-rose-500/10 text-rose-600",
  SHARE_BUY: "bg-amber-500/10 text-amber-600",
  MEMBER_APPROVE: "bg-emerald-500/10 text-emerald-600",
  MEMBER_SUSPENDED: "bg-rose-500/10 text-rose-600",
  MEMBER_CLOSED: "bg-zinc-500/10 text-zinc-600",
  INVESTMENT_CREATE: "bg-violet-500/10 text-violet-600",
  SYSTEM: "bg-zinc-500/10 text-zinc-600",
};

export function AdminAuditTab() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState("ALL");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = action !== "ALL" ? `?action=${action}` : "";
      const res = await api.get<{ logs: Log[] }>(`/api/admin/audit${params}`);
      setLogs(res.logs);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to load audit log.");
    } finally {
      setLoading(false);
    }
  }, [action]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Audit Log</h2>
          <p className="text-sm text-muted-foreground">Every important action, tracked and traceable</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger className="w-52 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All actions</SelectItem>
              <SelectItem value="LOGIN">Login</SelectItem>
              <SelectItem value="LOGOUT">Logout</SelectItem>
              <SelectItem value="REGISTER">Register</SelectItem>
              <SelectItem value="DEPOSIT">Deposit</SelectItem>
              <SelectItem value="WITHDRAWAL">Withdrawal</SelectItem>
              <SelectItem value="SHARE_BUY">Share buy</SelectItem>
              <SelectItem value="MEMBER_APPROVE">Member approve</SelectItem>
              <SelectItem value="MEMBER_SUSPENDED">Suspend</SelectItem>
              <SelectItem value="INVESTMENT_CREATE">Investment create</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
          </div>
        ) : logs.length === 0 ? (
          <EmptyState icon={Activity} title="No audit entries" />
        ) : (
          <div className="divide-y divide-border/50 max-h-[70vh] overflow-y-auto">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 p-4 hover:bg-muted/30">
                <div className={`size-9 rounded-lg flex items-center justify-center shrink-0 ${ACTION_COLORS[log.action] ?? "bg-zinc-500/10 text-zinc-600"}`}>
                  <ShieldCheck className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ACTION_COLORS[log.action] ?? "bg-zinc-500/10 text-zinc-600"}`}>
                      {log.action}
                    </span>
                    <span className="text-xs text-muted-foreground">{log.entity}</span>
                  </div>
                  <p className="text-sm mt-1">{log.details}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {log.user?.fullName ?? "System"} · {log.user?.email ?? "—"} · {formatDateTime(log.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
