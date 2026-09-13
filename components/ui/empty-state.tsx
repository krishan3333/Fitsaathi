import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center gap-3 rounded-[1.25rem] border border-dashed border-border px-6 py-9 text-center", className)}>
      <div className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-5" />
      </div>
      <div className="max-w-[34ch] space-y-1">
        <p className="font-semibold tracking-[-0.01em]">{title}</p>
        {description && <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[1.25rem] border border-danger/25 bg-danger/5 px-6 py-7 text-center">
      <p className="font-semibold tracking-[-0.01em] text-danger">Something went wrong</p>
      <p className="max-w-[42ch] text-sm leading-relaxed text-muted-foreground">{message}</p>
      {retry && (
        <button onClick={retry} className="mt-1 text-sm font-medium text-primary underline underline-offset-4">
          Try again
        </button>
      )}
    </div>
  );
}
