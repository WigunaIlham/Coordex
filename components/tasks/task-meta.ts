import type { TaskPriority, TaskStatus } from "@/lib/generated/prisma/client";

export const STATUS_COLUMNS: { value: TaskStatus; label: string }[] = [
  { value: "TODO", label: "Belum Dikerjakan" },
  { value: "IN_PROGRESS", label: "Sedang Dikerjakan" },
  { value: "REVIEW", label: "Review" },
  { value: "DONE", label: "Selesai" },
];

export const PRIORITY_META: Record<
  TaskPriority,
  { label: string; badgeClass: string }
> = {
  LOW: { label: "Rendah", badgeClass: "bg-slate-100 text-slate-700 border-slate-200" },
  MEDIUM: { label: "Sedang", badgeClass: "bg-blue-100 text-blue-700 border-blue-200" },
  HIGH: { label: "Tinggi", badgeClass: "bg-orange-100 text-orange-700 border-orange-200" },
  URGENT: { label: "Sangat Mendesak", badgeClass: "bg-red-100 text-red-700 border-red-200" },
};
