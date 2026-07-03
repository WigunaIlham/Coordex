import type { TaskPriority, TaskStatus, Role } from "@/lib/generated/prisma/client";

export type TaskCardData = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  points: number;
  dueDate: string | null;
  createdBy: { id: string; name: string; avatarUrl: string | null };
  assignees: { id: string; name: string; avatarUrl: string | null; role: Role }[];
  attachmentCount: number;
};

export type AssigneeOption = {
  id: string;
  name: string;
  role: Role;
};
