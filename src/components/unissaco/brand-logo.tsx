import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  variant?: "default" | "light";
}

// UNISSACO mark  a sprout (growth) inside a shield (cooperative trust).
export function BrandLogo({ className, size = 36, showText = false, variant = "default" }: BrandLogoProps) {
  const textColor = variant === "light" ? "text-white" : "text-foreground";
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="uni-grad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop stopColor="oklch(0.6 0.14 162)" />
            <stop offset="1" stopColor="oklch(0.42 0.1 185)" />
          </linearGradient>
        </defs>
        <path
          d="M24 3.5 6.5 10.2v13.6c0 10.3 7.2 17.4 17.5 20.7 10.3-3.3 17.5-10.4 17.5-20.7V10.2L24 3.5Z"
          fill="url(#uni-grad)"
        />
        <path d="M24 34V20.5" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
        <path
          d="M24 23c-2-3.2-5.4-4-8.2-3.4.2 3.2 2.4 5.6 5.4 6.2"
          stroke="white"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M24 21.5c2-3.2 5.4-4 8.2-3.4-.2 3.2-2.4 5.6-5.4 6.2"
          stroke="white"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="24" cy="14.5" r="2.1" fill="oklch(0.82 0.16 90)" />
      </svg>
      {showText && (
        <div className="flex flex-col leading-none">
          <span className={cn("font-bold tracking-tight text-base", textColor)}>UNISSACO</span>
          <span className={cn("text-[10px] font-medium", variant === "light" ? "text-white/70" : "text-muted-foreground")}>
            Save · Invest · Grow
          </span>
        </div>
      )}
    </div>
  );
}
