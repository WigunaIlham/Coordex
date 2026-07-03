import { CardListSkeleton, PageHeaderSkeleton } from "@/components/shared/skeletons";

export default function RapatLoading() {
  return (
    <div>
      <PageHeaderSkeleton />
      <CardListSkeleton rows={5} />
    </div>
  );
}
