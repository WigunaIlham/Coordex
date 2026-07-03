import { PageHeaderSkeleton } from "@/components/shared/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function KonsumsiLoading() {
  return (
    <div>
      <PageHeaderSkeleton />
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border">
        {Array.from({ length: 42 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    </div>
  );
}
