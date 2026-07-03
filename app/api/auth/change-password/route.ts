import bcrypt from "bcryptjs";
import { z } from "zod";

import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const schema = z.object({
  currentPassword: z.string().min(1, "Password lama wajib diisi"),
  newPassword: z
    .string()
    .min(8, "Password baru minimal 8 karakter")
    .regex(/[A-Za-z]/, "Password baru harus mengandung huruf")
    .regex(/[0-9]/, "Password baru harus mengandung angka"),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return apiErr(parsed.error.issues[0]?.message ?? "Input tidak valid", 400);
  }

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user) return apiErr("Pengguna tidak ditemukan", 404);

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.password);
  if (!valid) return apiErr("Password lama salah", 400);

  if (parsed.data.currentPassword === parsed.data.newPassword) {
    return apiErr("Password baru harus berbeda dari password lama", 400);
  }

  const hashed = await bcrypt.hash(parsed.data.newPassword, 12);
  await db.user.update({
    where: { id: user.id },
    data: { password: hashed, isPasswordChanged: true },
  });

  return apiOk({ ok: true });
}
