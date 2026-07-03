import { KpiSkeletonGrid, CardListSkeleton, PageHeaderSkeleton } from "@/components/shared/skeletons";

export default function DashboardLoading() {
  return (
    <div>
      <PageHeaderSkeleton />
      <KpiSkeletonGrid />
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <CardListSkeleton rows={4} />
        <CardListSkeleton rows={3} />
      </div>
    </div>
  );
}
