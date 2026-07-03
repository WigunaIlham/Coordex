import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { updateSurveyWindowSchema } from "@/lib/validators/stress";
import { isAdminOrKetua } from "@/lib/permissions";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);
  if (!isAdminOrKetua(session.user.role)) {
    return apiErr("Hanya Ketua yang dapat mengubah jadwal survei", 403);
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updateSurveyWindowSchema.safeParse(body);
  if (!parsed.success) {
    return apiErr(parsed.error.issues[0]?.message ?? "Input tidak valid", 400);
  }

  const updated = await db.stressSurvey.update({
    where: { id },
    data: parsed.data,
  });
  return apiOk(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);
  if (!isAdminOrKetua(session.user.role)) return apiErr("Forbidden", 403);

  const { id } = await params;
  await db.stressSurvey.delete({ where: { id } });
  return apiOk({ ok: true });
}
