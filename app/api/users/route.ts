import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateTemporaryPassword, hashPassword } from "@/lib/password";
import { createUserSchema, RoleEnum } from "@/lib/validators/user";
import { hasPermission } from "@/lib/permissions";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);

  const url = new URL(req.url);
  const role = url.searchParams.get("role");
  const isActiveParam = url.searchParams.get("isActive");

  const where: Record<string, unknown> = {};
  if (role) {
    const parsed = RoleEnum.safeParse(role);
    if (parsed.success) where.role = parsed.data;
  }
  if (isActiveParam !== null) {
    where.isActive = isActiveParam === "true";
  }

  const users = await db.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatarUrl: true,
      phone: true,
      studentId: true,
      isActive: true,
      isPasswordChanged: true,
      createdAt: true,
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  return apiOk(users, { total: users.length });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);
  if (!hasPermission(session.user.role, "admin.users")) {
    return apiErr("Hanya Ketua yang dapat membuat akun", 403);
  }

  const body = await req.json().catch(() => null);
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return apiErr(parsed.error.issues[0]?.message ?? "Input tidak valid", 400);
  }

  const exists = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (exists) return apiErr("Email sudah terdaftar", 409);

  const tempPassword = generateTemporaryPassword();
  const hashed = await hashPassword(tempPassword);

  const user = await db.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
      studentId: parsed.data.studentId ?? null,
      phone: parsed.data.phone ?? null,
      password: hashed,
      isPasswordChanged: false,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
    },
  });

  return apiOk({ user, temporaryPassword: tempPassword }, undefined, { status: 201 });
}
