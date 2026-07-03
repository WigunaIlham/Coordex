import { PRIORITY_MULTIPLIERS, WORKLOAD_CAPACITY } from "@/lib/constants";
import type { TaskPriority, TaskStatus } from "@/lib/generated/prisma/client";
import type { WorkloadStatus } from "@/types";

export type WorkloadTaskInput = {
  status: TaskStatus;
  priority: TaskPriority;
  points: number;
};

export const ACTIVE_TASK_STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "REVIEW"];

export function computeWorkload(tasks: WorkloadTaskInput[]): {
  weightedPoints: number;
  utilizationPercent: number;
  status: WorkloadStatus;
} {
  const active = tasks.filter((t) => ACTIVE_TASK_STATUSES.includes(t.status));
  const weighted = active.reduce(
    (sum, t) => sum + t.points * PRIORITY_MULTIPLIERS[t.priority],
    0
  );
  const utilizationPercent = (weighted / WORKLOAD_CAPACITY) * 100;

  const status: WorkloadStatus =
    utilizationPercent < 60
      ? "UNDERUTILIZED"
      : utilizationPercent <= 100
        ? "NORMAL"
        : "OVERLOADED";

  return {
    weightedPoints: Number(weighted.toFixed(1)),
    utilizationPercent: Number(utilizationPercent.toFixed(1)),
    status,
  };
}

export function workloadStatusLabel(status: WorkloadStatus): string {
  switch (status) {
    case "UNDERUTILIZED":
      return "Tidak Optimal";
    case "NORMAL":
      return "Normal";
    case "OVERLOADED":
      return "Kelebihan Beban";
  }
}
