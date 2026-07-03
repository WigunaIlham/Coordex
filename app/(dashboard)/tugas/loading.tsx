import {
  KanbanSkeleton,
  PageHeaderSkeleton,
} from "@/components/shared/skeletons";

export default function TugasLoading() {
  return (
    <div>
      <PageHeaderSkeleton />
      <KanbanSkeleton />
    </div>
  );
}
