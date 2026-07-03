import { z } from "zod";

export const overrideDutySchema = z.object({
  userIds: z.array(z.string().min(1)).min(1, "Minimal 1 anggota"),
});

export const createSwapSchema = z.object({
  dutyId: z.string().min(1),
  targetId: z.string().min(1),
  reason: z.string().max(500).optional().nullable(),
});

export const decideSwapSchema = z.object({
  status: z.enum(["DISETUJUI", "DITOLAK"]),
});
