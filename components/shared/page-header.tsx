import { Breadcrumb, type BreadcrumbItem } from "@/components/shared/breadcrumb";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  description?: string;
  action?: React.ReactNode;
  breadcrumb?: BreadcrumbItem[];
  className?: string;
};

/**
 * Unified page header used on every dashboard route.
 *
 * Layout:
 *   [ breadcrumb (optional) ]
 *   [ title / description ] ................... [ action ]
 *
 * On mobile, action wraps below the title to keep touch targets full-width.
 */
export function PageHeader({ title, description, action, breadcrumb, className }: Props) {
  return (
    <div className={cn("mb-6 space-y-2", className)}>
      {breadcrumb && breadcrumb.length > 0 && <Breadcrumb items={breadcrumb} />}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
      </div>
    </div>
  );
}
