import { Badge } from "@/components/ui/badge";
import type { MeetingStatus } from "@/lib/generated/prisma/client";
import { MEETING_STATUS_LABELS } from "@/lib/validators/meeting";
import { cn } from "@/lib/utils";

const STATUS_CLASS: Record<MeetingStatus, string> = {
  TERJADWAL: "bg-blue-50 text-blue-700 border-blue-200",
  BERLANGSUNG: "bg-amber-50 text-amber-700 border-amber-200",
  SELESAI: "bg-emerald-50 text-emerald-700 border-emerald-200",
  DIBATALKAN: "bg-slate-100 text-slate-600 border-slate-200",
};

export function MeetingStatusBadge({ status }: { status: MeetingStatus }) {
  return (
    <Badge variant="outline" className={cn("border", STATUS_CLASS[status])}>
      {MEETING_STATUS_LABELS[status]}
    </Badge>
  );
}
