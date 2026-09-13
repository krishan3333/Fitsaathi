import * as React from "react";
import { cn } from "@/lib/utils";

/** Flat and hairline by default — structure, not decoration. Elevation is
 * opt-in (`shadow-lift` on things you can press, `shadow-float` on things
 * that sit above the page) so a shadow always means something. */
function Card({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("rounded-[1.375rem] border border-border bg-card text-card-foreground", className)} {...props} />;
}
function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1 px-5 pt-5", className)} {...props} />;
}
function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return <h3 className={cn("text-[0.95rem] font-semibold leading-tight tracking-[-0.015em]", className)} {...props} />;
}
function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-sm leading-relaxed text-muted-foreground", className)} {...props} />;
}
function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("p-5", className)} {...props} />;
}
function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex items-center gap-2 px-5 pb-5", className)} {...props} />;
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
