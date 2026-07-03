import { z } from "zod";

export const TaskStatusEnum = z.enum(["TODO", "IN_PROGRESS", "REVIEW", "DONE"]);
export const TaskPriorityEnum = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

export const createTaskSchema = z.object({
  title: z.string().min(1, "Judul wajib diisi").max(200, "Judul maksimal 200 karakter"),
  description: z.string().max(5000).optional().nullable(),
  priority: TaskPriorityEnum.default("MEDIUM"),
  points: z.coerce.number().int().min(1, "Points minimal 1").max(10, "Points maksimal 10").default(3),
  dueDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().date())
    .optional()
    .nullable()
    .transform((v) => (v ? new Date(v) : null)),
  assigneeIds: z.array(z.string().min(1)).min(1, "Minimal 1 anggota"),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).nullable().optional(),
  priority: TaskPriorityEnum.optional(),
  points: z.coerce.number().int().min(1).max(10).optional(),
  dueDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().date())
    .nullable()
    .optional()
    .transform((v) => (v === undefined ? undefined : v === null ? null : new Date(v))),
  status: TaskStatusEnum.optional(),
});

export const updateTaskStatusSchema = z.object({
  status: TaskStatusEnum,
});

export const taskQuerySchema = z.object({
  status: TaskStatusEnum.optional(),
  priority: TaskPriorityEnum.optional(),
  assigneeId: z.string().optional(),
  search: z.string().optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
