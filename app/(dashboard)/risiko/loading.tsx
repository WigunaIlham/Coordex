import { CardListSkeleton, PageHeaderSkeleton } from "@/components/shared/skeletons";

export default function RisikoLoading() {
  return (
    <div>
      <PageHeaderSkeleton />
      <CardListSkeleton rows={4} />
    </div>
  );
}
