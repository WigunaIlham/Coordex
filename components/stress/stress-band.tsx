import { Badge } from "@/components/ui/badge";
import { stressBandLabel } from "@/lib/services/stress.service";
import { cn } from "@/lib/utils";
import type { StressBand } from "@/types";

const BAND_BADGE_CLASS: Record<StressBand, string> = {
  RENDAH: "bg-emerald-50 text-emerald-700 border-emerald-200",
  SEDANG: "bg-amber-50 text-amber-700 border-amber-200",
  TINGGI: "bg-red-50 text-red-700 border-red-200",
};

export function StressBandBadge({ band }: { band: StressBand }) {
  return (
    <Badge variant="outline" className={cn("border", BAND_BADGE_CLASS[band])}>
      {stressBandLabel(band)}
    </Badge>
  );
}

export const BAND_COLOR: Record<StressBand, string> = {
  RENDAH: "#10b981",
  SEDANG: "#f59e0b",
  TINGGI: "#ef4444",
};
