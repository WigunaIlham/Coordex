import { z } from "zod";

export const RoleEnum = z.enum([
  "SUPER_ADMIN",
  "KETUA",
  "SEKRETARIS",
  "BENDAHARA",
  "PJ_PDD",
  "ANGGOTA_PDD",
  "PJ_KONSUMSI",
  "PJ_ACARA",
  "ANGGOTA_ACARA",
  "PJ_HUMLOG",
  "ANGGOTA_HUMLOG",
]);

export const createUserSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter").max(120),
  email: z.string().email("Format email tidak valid").toLowerCase(),
  role: RoleEnum,
  studentId: z.string().max(40).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter").max(120).optional(),
  phone: z.string().max(40).optional().nullable(),
  studentId: z.string().max(40).optional().nullable(),
});

export const updateRoleSchema = z.object({
  role: RoleEnum,
});

export const updateStatusSchema = z.object({
  isActive: z.boolean(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
