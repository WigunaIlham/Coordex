import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { updateActivitySchema } from "@/lib/validators/activity";
import { isAdminOrKetua } from "@/lib/permissions";

export const runtime = "nodejs";

async function loadAndAuthorize(id: string, userId: string, isKetua: boolean) {
  const activity = await db.activityUpdate.findUnique({ where: { id } });
  if (!activity) return { error: apiErr("Aktivitas tidak ditemukan", 404), activity: null };
  if (activity.authorId !== userId && !isKetua) {
    return { error: apiErr("Anda tidak punya akses", 403), activity: null };
  }
  return { error: null, activity };
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);

  const { id } = await params;
  const { error } = await loadAndAuthorize(id, session.user.id, isAdminOrKetua(session.user.role));
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = updateActivitySchema.safeParse(body);
  if (!parsed.success) return apiErr("Input tidak valid", 400);

  const updated = await db.activityUpdate.update({
    where: { id },
    data: parsed.data,
    include: {
      author: { select: { id: true, name: true, avatarUrl: true, role: true } },
    },
  });
  return apiOk(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);

  const { id } = await params;
  const { error } = await loadAndAuthorize(id, session.user.id, isAdminOrKetua(session.user.role));
  if (error) return error;

  await db.activityUpdate.delete({ where: { id } });
  return apiOk({ ok: true });
}
