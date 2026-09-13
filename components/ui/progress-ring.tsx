import { cn } from "@/lib/utils";

interface ProgressRingProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  /** Tailwind stroke-* class for the filled arc — defaults to the brand
   * colour, but the per-metric accent tokens (stroke-accent-pink, etc.) let
   * a ring join the same varied-hue tile language as the rest of a metric grid. */
  indicatorClassName?: string;
  children?: React.ReactNode;
}

/** A 260° gauge rather than a closed ring: the gap at the bottom gives the
 * figure inside somewhere to sit, and reads as a dial being filled rather
 * than a target being closed. */
const SWEEP = 260 / 360;

export function ProgressRing({ value, max, size = 168, strokeWidth = 10, className, indicatorClassName = "stroke-primary", children }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const arc = circumference * SWEEP;
  const pct = Math.min(1, max > 0 ? value / max : 0);

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      {/* Rotated so the 100° gap sits centred at the bottom of the dial. */}
      <svg width={size} height={size} className="rotate-[140deg]" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${arc} ${circumference}`}
          className="fill-none stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${arc * pct} ${circumference}`}
          className={cn("fill-none transition-[stroke-dasharray] duration-700 ease-out", indicatorClassName)}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}
