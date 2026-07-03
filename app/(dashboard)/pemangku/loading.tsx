import { CardListSkeleton, PageHeaderSkeleton } from "@/components/shared/skeletons";

export default function PemangkuLoading() {
  return (
    <div>
      <PageHeaderSkeleton />
      <CardListSkeleton rows={4} />
    </div>
  );
}
