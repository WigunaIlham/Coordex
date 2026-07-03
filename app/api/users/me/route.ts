import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { updateProfileSchema } from "@/lib/validators/user";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      avatarUrl: true,
      phone: true,
      studentId: true,
      isActive: true,
      isPasswordChanged: true,
      createdAt: true,
    },
  });
  if (!user) return apiErr("Pengguna tidak ditemukan", 404);

  return apiOk(user);
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return apiErr(parsed.error.issues[0]?.message ?? "Input tidak valid", 400);
  }

  const updated = await db.user.update({
    where: { id: session.user.id },
    data: parsed.data,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      avatarUrl: true,
      phone: true,
      studentId: true,
    },
  });

  return apiOk(updated);
}
