"use client";

import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "inline-flex h-[1.6rem] w-[2.85rem] shrink-0 cursor-pointer items-center rounded-full border border-border bg-muted transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background data-[state=checked]:border-primary data-[state=checked]:bg-primary",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block size-[1.15rem] translate-x-[0.18rem] rounded-full bg-card shadow-soft ring-1 ring-foreground/5 transition-transform duration-200 data-[state=checked]:translate-x-[1.5rem] data-[state=checked]:bg-white" />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
