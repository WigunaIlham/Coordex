"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

import { TaskCard } from "@/components/tasks/task-card";
import type { TaskCardData } from "@/components/tasks/types";
import type { TaskStatus } from "@/lib/generated/prisma/client";
import { cn } from "@/lib/utils";

type Props = {
  status: TaskStatus;
  label: string;
  tasks: TaskCardData[];
  onCardClick: (task: TaskCardData) => void;
  onCardDelete?: (task: TaskCardData) => void;
};

// Colored dot per status — helps identify columns quickly during a drag.
const STATUS_DOT: Record<TaskStatus, string> = {
  TODO: "bg-slate-400",
  IN_PROGRESS: "bg-blue-500",
  REVIEW: "bg-amber-500",
  DONE: "bg-emerald-500",
};

export function KanbanColumn({
  status,
  label,
  tasks,
  onCardClick,
  onCardDelete,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: { status },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex h-full min-w-[260px] flex-col rounded-xl border bg-muted/40 p-3 transition-colors",
        isOver && "border-primary/60 bg-primary/5 ring-2 ring-inset ring-primary/20",
      )}
      aria-label={`Kolom ${label}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <span
            aria-hidden
            className={cn("h-2 w-2 rounded-full", STATUS_DOT[status])}
          />
          {label}
        </h3>
        <span className="rounded-full bg-background px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
          {tasks.length}
        </span>
      </div>
      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
          {tasks.length === 0 && (
            <p
              className={cn(
                "rounded-md border border-dashed py-6 text-center text-[11px] transition-colors",
                isOver ? "border-primary/60 text-primary" : "text-muted-foreground",
              )}
            >
              {isOver ? "Lepas di sini" : "Belum ada tugas"}
            </p>
          )}
          {tasks.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              onClick={onCardClick}
              onDelete={onCardDelete}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}
