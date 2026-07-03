import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { updateConflictStatusSchema } from "@/lib/validators/conflict";
import { isAdminOrKetua } from "@/lib/permissions";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);
  if (!isAdminOrKetua(session.user.role)) {
    return apiErr("Hanya Ketua yang dapat mengubah status laporan", 403);
  }

  const body = await req.json().catch(() => null);
  const parsed = updateConflictStatusSchema.safeParse(body);
  if (!parsed.success) {
    return apiErr(parsed.error.issues[0]?.message ?? "Input tidak valid", 400);
  }

  const { id } = await params;
  const exists = await db.conflictReport.findUnique({ where: { id } });
  if (!exists) return apiErr("Laporan tidak ditemukan", 404);

  const updated = await db.conflictReport.update({
    where: { id },
    data: {
      status: parsed.data.status,
      resolutionNotes: parsed.data.resolutionNotes ?? exists.resolutionNotes,
      managedById: session.user.id,
    },
    select: {
      id: true,
      status: true,
      resolutionNotes: true,
      managedBy: { select: { id: true, name: true } },
    },
  });
  return apiOk(updated);
}
