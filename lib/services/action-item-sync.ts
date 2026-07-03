import type { ActionItemStatus, TaskStatus } from "@/lib/generated/prisma/client";

export function actionItemStatusToTaskStatus(s: ActionItemStatus): TaskStatus {
  switch (s) {
    case "BELUM":
      return "TODO";
    case "PROGRESS":
      return "IN_PROGRESS";
    case "SELESAI":
      return "DONE";
  }
}

// REVIEW status has no counterpart on the action item; treat it as PROGRESS.
export function taskStatusToActionItemStatus(s: TaskStatus): ActionItemStatus {
  switch (s) {
    case "TODO":
      return "BELUM";
    case "IN_PROGRESS":
    case "REVIEW":
      return "PROGRESS";
    case "DONE":
      return "SELESAI";
  }
}

// Truncate the free-form description into a Task.title (max 200 chars).
export function actionItemDescriptionToTaskTitle(desc: string): string {
  const trimmed = desc.trim().replace(/\s+/g, " ");
  return trimmed.length > 200 ? trimmed.slice(0, 197) + "…" : trimmed;
}
