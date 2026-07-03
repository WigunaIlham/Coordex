import {
  CardListSkeleton,
  KpiSkeletonGrid,
  PageHeaderSkeleton,
} from "@/components/shared/skeletons";

export default function PencapaianLoading() {
  return (
    <div>
      <PageHeaderSkeleton />
      <KpiSkeletonGrid count={4} />
      <div className="mt-6">
        <CardListSkeleton rows={4} />
      </div>
    </div>
  );
}
