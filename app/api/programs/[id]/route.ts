import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { updateProgramSchema } from "@/lib/validators/program";

export const runtime = "nodejs";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);
  if (!hasPermission(session.user.role, "program.crud")) {
    return apiErr("Tidak diizinkan", 403);
  }
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updateProgramSchema.safeParse(body);
  if (!parsed.success) return apiErr("Input tidak valid", 400);

  const updated = await db.program.update({ where: { id }, data: parsed.data });
  return apiOk(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);
  if (!hasPermission(session.user.role, "program.crud")) {
    return apiErr("Tidak diizinkan", 403);
  }
  const { id } = await params;
  await db.program.delete({ where: { id } });
  return apiOk({ ok: true });
}
