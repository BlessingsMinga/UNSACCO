"use client";

import { BrandLogo } from "@/components/unissaco/brand-logo";
import { Loader2 } from "lucide-react";

export function FullPageLoader() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 surface-grid">
      <BrandLogo size={56} />
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="size-4 animate-spin" />
        Loading UNISSACO…
      </div>
    </div>
  );
}
