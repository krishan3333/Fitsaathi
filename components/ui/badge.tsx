import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/** Chips carry state, so they're ringed rather than filled — a tinted blob
 * reads as decoration, a ringed chip reads as a value. */
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.72rem] font-medium leading-none ring-1 ring-inset [&_svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-primary/10 text-primary ring-primary/20",
        success: "bg-success/12 text-success ring-success/25",
        warning: "bg-warning/12 text-warning ring-warning/25",
        danger: "bg-danger/10 text-danger ring-danger/20",
        muted: "bg-muted text-muted-foreground ring-border",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

function Badge({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
