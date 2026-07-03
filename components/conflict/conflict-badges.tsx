import { Badge } from "@/components/ui/badge";
import type { ConflictStatus } from "@/lib/generated/prisma/client";
import { CONFLICT_STATUS_LABELS } from "@/lib/validators/conflict";
import { cn } from "@/lib/utils";

const STATUS_CLASS: Record<ConflictStatus, string> = {
  OPEN: "bg-red-50 text-red-700 border-red-200",
  DISKUSI: "bg-amber-50 text-amber-700 border-amber-200",
  SELESAI: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export function ConflictStatusBadge({ status }: { status: ConflictStatus }) {
  return (
    <Badge variant="outline" className={cn("border", STATUS_CLASS[status])}>
      {CONFLICT_STATUS_LABELS[status]}
    </Badge>
  );
}
