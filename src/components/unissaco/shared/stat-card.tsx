"use client";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  trend?: { value: string; positive?: boolean };
  accent?: "primary" | "gold" | "violet" | "sky" | "rose";
  className?: string;
}

const accentMap: Record<NonNullable<StatCardProps["accent"]>, string> = {
  primary: "bg-primary/10 text-primary",
  gold: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  violet: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  sky: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  rose: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
};

export function StatCard({ label, value, icon: Icon, hint, trend, accent = "primary", className }: StatCardProps) {
  return (
    <Card className={cn("p-5 gap-0 relative overflow-hidden", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold mt-1.5 tabular-nums animate-count-in truncate">{value}</p>
          {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
          {trend && (
            <p
              className={cn(
                "text-xs font-medium mt-1.5 inline-flex items-center gap-1",
                trend.positive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
              )}
            >
              {trend.positive ? "▲" : "▼"} {trend.value}
            </p>
          )}
        </div>
        <div className={cn("size-10 shrink-0 rounded-xl flex items-center justify-center", accentMap[accent])}>
          <Icon className="size-5" />
        </div>
      </div>
    </Card>
  );
}
