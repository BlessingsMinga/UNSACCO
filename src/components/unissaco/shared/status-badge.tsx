"use client";

import { cn } from "@/lib/utils";
import { STATUS_COLORS } from "@/lib/constants";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const color = STATUS_COLORS[status] ?? "bg-zinc-100 text-zinc-600 dark:bg-zinc-500/15 dark:text-zinc-400";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        color,
        className
      )}
    >
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      {status}
    </span>
  );
}
