import { CardListSkeleton, PageHeaderSkeleton } from "@/components/shared/skeletons";

export default function RabLoading() {
  return (
    <div>
      <PageHeaderSkeleton />
      <CardListSkeleton rows={4} />
    </div>
  );
}
