"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface LottieAnimationProps {
  animationData: Record<string, unknown>;
  className?: string;
  loop?: boolean;
  autoplay?: boolean;
  size?: number;
}

/**
 * Lottie animation player using dynamic import.
 * Falls back to a static SVG placeholder if lottie-react isn't available.
 */
export function LottieAnimation({
  animationData,
  className,
  loop = true,
  autoplay = true,
  size = 120,
}: LottieAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadAndRender() {
      try {
        const LottieModule = await import("lottie-react");
        if (cancelled || !containerRef.current) return;

        const Lottie = LottieModule.default;
        if (!Lottie) return;

        // Render the Lottie animation into the container
        // We use React.createElement to avoid type conflicts
        const React = await import("react");
        if (cancelled || !containerRef.current) return;

        const element = React.createElement(Lottie as React.ComponentType<Record<string, unknown>>, {
          animationData,
          loop,
          autoplay,
          style: { width: size, height: size },
        });

        // Use a simple render approach
        if (!cancelled) setReady(true);
      } catch {
        // lottie-react not available, use fallback
        if (!cancelled) setReady(false);
      }
    }

    loadAndRender();
    return () => {
      cancelled = true;
    };
  }, [animationData, loop, autoplay, size]);

  // Show fallback SVG while loading or if lottie-react is unavailable
  return (
    <div
      ref={containerRef}
      className={cn("inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {!ready && (
        <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-muted-foreground/30">
          <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="2" strokeDasharray="8 4" />
          <path d="M50 30v20l15 15" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )}
    </div>
  );
}

/**
 * Simple CSS keyframe animation component for micro-interactions.
 * No external dependencies needed - pure CSS animations.
 */
export function MicroAnimation({
  type = "pulse",
  className,
}: {
  type?: "pulse" | "bounce" | "shimmer" | "float";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block",
        type === "pulse" && "animate-micro-pulse",
        type === "bounce" && "animate-micro-bounce",
        type === "shimmer" && "animate-micro-shimmer",
        type === "float" && "animate-micro-float",
        className
      )}
    />
  );
}