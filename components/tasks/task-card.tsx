"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarIcon, GripVertical, Paperclip, Trash2 } from "lucide-react";
import { memo } from "react";

import { PRIORITY_META } from "@/components/tasks/task-meta";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate, getInitials } from "@/lib/utils";
import type { TaskCardData } from "./types";

type Props = {
  task: TaskCardData;
  onClick?: (task: TaskCardData) => void;
  onDelete?: (task: TaskCardData) => void;
};

function TaskCardImpl({ task, onClick, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id, data: { taskId: task.id } });

  const priority = PRIORITY_META[task.priority];
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "DONE";

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className="group relative rounded-md border bg-card p-3 text-card-foreground shadow-sm transition-colors hover:border-primary/40"
    >
      {onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task);
          }}
          aria-label="Hapus tugas"
          className="absolute right-1.5 top-1.5 rounded-md p-1 text-muted-foreground/60 opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="mt-0.5 cursor-grab text-muted-foreground/60 hover:text-foreground active:cursor-grabbing"
          {...attributes}
          {...listeners}
          aria-label="Geser tugas"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onClick?.(task)}
          className="min-w-0 flex-1 text-left"
        >
          <p className="line-clamp-2 text-sm font-medium leading-snug">{task.title}</p>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className={cn("border", priority.badgeClass)}>
              {priority.label}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {task.points} poin
            </Badge>
            {task.attachmentCount > 0 && (
              <Badge variant="outline" className="text-xs">
                <Paperclip className="mr-1 h-3 w-3" /> {task.attachmentCount}
              </Badge>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="flex -space-x-2">
              {task.assignees.slice(0, 3).map((a) => (
                <Avatar key={a.id} className="h-6 w-6 border-2 border-background">
                  <AvatarImage src={a.avatarUrl ?? undefined} alt={a.name} />
                  <AvatarFallback className="text-[10px]">
                    {getInitials(a.name)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {task.assignees.length > 3 && (
                <div className="grid h-6 w-6 place-items-center rounded-full border-2 border-background bg-muted text-[10px] font-medium">
                  +{task.assignees.length - 3}
                </div>
              )}
            </div>
            {task.dueDate && (
              <div
                className={cn(
                  "flex items-center gap-1 text-xs",
                  isOverdue ? "text-destructive" : "text-muted-foreground"
                )}
              >
                <CalendarIcon className="h-3 w-3" />
                {formatDate(task.dueDate, { dateStyle: "medium" })}
              </div>
            )}
          </div>
        </button>
      </div>
    </div>
  );
}

// Cards are re-rendered constantly by dnd-kit + filter changes on the board.
// Shallow-compare Props so a card only re-renders when its own task ref (or
// click handler ref) changes — see the useCallback in kanban-board.tsx.
export const TaskCard = memo(TaskCardImpl);

