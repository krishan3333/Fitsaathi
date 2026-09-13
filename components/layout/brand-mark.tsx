import { cn } from "@/lib/utils";

/** The product's own geometry as the identity: the same 260° dial that shows
 * step progress on the dashboard and marks conditions along the day rail. */
export function BrandMark({ className }: { className?: string }) {
  const r = 8;
  const circumference = 2 * Math.PI * r;
  const arc = circumference * (260 / 360);
  return (
    <span className={cn("flex size-8 items-center justify-center rounded-[0.7rem] bg-primary text-primary-foreground", className)}>
      <svg viewBox="0 0 24 24" className="size-[55%]" aria-hidden="true">
        <circle
          cx="12"
          cy="12"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${arc} ${circumference}`}
          transform="rotate(140 12 12)"
          opacity="0.5"
        />
        <circle
          cx="12"
          cy="12"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${arc * 0.62} ${circumference}`}
          transform="rotate(140 12 12)"
        />
      </svg>
    </span>
  );
}
