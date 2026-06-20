"use client";

import { BrandLogo } from "@/components/unissaco/brand-logo";
import { Loader2 } from "lucide-react";

export function FullPageLoader() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-background">
      <div className="relative">
        <BrandLogo size={56} />
        <span className="absolute -top-1 -right-1 flex size-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex size-3 rounded-full bg-primary" />
        </span>
      </div>
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="size-4 animate-spin" />
        Loading UNISSACO&hellip;
      </div>
      <div className="flex gap-1.5 mt-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="size-1.5 rounded-full bg-primary/40 animate-micro-bounce"
            style={{ animationDelay: `${i * 200}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

export function SectionLoader({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-4 stagger-children">
      <div className="h-8 w-48 rounded-lg bg-muted animate-pulse" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
      <div className="h-80 rounded-xl bg-muted animate-pulse" />
    </div>
  );
}

export function DotLoader({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 ${className ?? ""}`}>
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="size-1.5 rounded-full bg-current animate-micro-bounce"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}