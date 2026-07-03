import { z } from "zod";

export const MeetingStatusEnum = z.enum([
  "TERJADWAL",
  "BERLANGSUNG",
  "SELESAI",
  "DIBATALKAN",
]);

export const createMeetingSchema = z.object({
  title: z.string().min(1, "Judul wajib").max(200),
  scheduledAt: z
    .string()
    .datetime({ offset: true })
    .or(z.string().date())
    .transform((v) => new Date(v)),
  location: z.string().max(200).optional().nullable(),
  agenda: z.string().max(5000).optional().nullable(),
  attendeeIds: z.array(z.string()).min(1, "Minimal 1 peserta"),
});

export const updateMeetingSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  scheduledAt: z
    .string()
    .datetime({ offset: true })
    .or(z.string().date())
    .transform((v) => new Date(v))
    .optional(),
  location: z.string().max(200).nullable().optional(),
  agenda: z.string().max(5000).nullable().optional(),
});

export const updateMeetingStatusSchema = z.object({
  status: MeetingStatusEnum,
});

export const updateAttendanceSchema = z.object({
  attendance: z
    .array(
      z.object({
        userId: z.string().min(1),
        attended: z.boolean(),
        notes: z.string().max(500).optional().nullable(),
      })
    )
    .min(1),
});

export const updateMinutesSchema = z.object({
  minutes: z.string().max(20000),
});

export const createActionItemSchema = z.object({
  description: z.string().min(1, "Deskripsi wajib").max(2000),
  assignedToId: z.string().min(1),
  dueDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().date())
    .optional()
    .nullable()
    .transform((v) => (v ? new Date(v) : null)),
});

export const ActionItemStatusEnum = z.enum(["BELUM", "PROGRESS", "SELESAI"]);

export const updateActionItemSchema = z.object({
  description: z.string().max(2000).optional(),
  assignedToId: z.string().optional(),
  status: ActionItemStatusEnum.optional(),
  dueDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().date())
    .nullable()
    .optional()
    .transform((v) => (v === undefined ? undefined : v === null ? null : new Date(v))),
});

export const MEETING_STATUS_LABELS = {
  TERJADWAL: "Terjadwal",
  BERLANGSUNG: "Berlangsung",
  SELESAI: "Selesai",
  DIBATALKAN: "Dibatalkan",
} as const;

export const ACTION_ITEM_STATUS_LABELS = {
  BELUM: "Belum dimulai",
  PROGRESS: "Sedang dikerjakan",
  SELESAI: "Selesai",
} as const;
