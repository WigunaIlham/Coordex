import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

type Props = {
  items: BreadcrumbItem[];
  className?: string;
};

/**
 * Compact breadcrumb: 12px, links → foreground, current page bold.
 * Renders as a semantic <nav> with aria-label for a11y.
 */
export function Breadcrumb({ items, className }: Props) {
  if (items.length === 0) return null;
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        "flex items-center gap-1 overflow-x-auto text-xs text-muted-foreground",
        className,
      )}
    >
      <ol className="flex items-center gap-1">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />}
              {item.href && !last ? (
                <Link
                  href={item.href}
                  className="whitespace-nowrap rounded px-1 py-0.5 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={last ? "page" : undefined}
                  className={cn(
                    "whitespace-nowrap px-1",
                    last && "font-medium text-foreground",
                  )}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
