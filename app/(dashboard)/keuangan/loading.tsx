import {
  KpiSkeletonGrid,
  PageHeaderSkeleton,
  TableSkeleton,
} from "@/components/shared/skeletons";

export default function KeuanganLoading() {
  return (
    <div>
      <PageHeaderSkeleton />
      <KpiSkeletonGrid count={3} />
      <div className="mt-6">
        <TableSkeleton rows={8} />
      </div>
    </div>
  );
}
