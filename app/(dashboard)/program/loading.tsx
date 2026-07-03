import { CardListSkeleton, PageHeaderSkeleton } from "@/components/shared/skeletons";

export default function ProgramLoading() {
  return (
    <div>
      <PageHeaderSkeleton />
      <CardListSkeleton rows={5} />
    </div>
  );
}
