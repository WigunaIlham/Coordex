import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
};

/**
 * Consistent empty state used across all modules. Every empty view should
 * follow the same rhythm: icon → title → helper text → primary CTA.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact = false,
}: Props) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 text-center",
        compact ? "gap-2 px-4 py-8" : "gap-3 px-6 py-14",
        className,
      )}
    >
      {Icon && (
        <div
          className={cn(
            "grid place-items-center rounded-full bg-background",
            compact ? "h-10 w-10" : "h-14 w-14",
          )}
        >
          <Icon
            className={cn(compact ? "h-5 w-5" : "h-6 w-6", "text-muted-foreground")}
          />
        </div>
      )}
      <div className="space-y-1">
        <p className={cn("font-medium", compact ? "text-sm" : "text-base")}>{title}</p>
        {description && (
          <p className="mx-auto max-w-sm text-xs text-muted-foreground sm:text-sm">
            {description}
          </p>
        )}
      </div>
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}
