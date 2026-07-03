import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { updateAttendanceSchema } from "@/lib/validators/meeting";
import { isAdminOrKetua } from "@/lib/permissions";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);
  if (!isAdminOrKetua(session.user.role) && session.user.role !== "SEKRETARIS") {
    return apiErr("Forbidden", 403);
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updateAttendanceSchema.safeParse(body);
  if (!parsed.success) return apiErr("Input tidak valid", 400);

  await db.$transaction(
    parsed.data.attendance.map((a) =>
      db.meetingAttendee.upsert({
        where: { meetingId_userId: { meetingId: id, userId: a.userId } },
        update: { attended: a.attended, notes: a.notes ?? null },
        create: {
          meetingId: id,
          userId: a.userId,
          attended: a.attended,
          notes: a.notes ?? null,
        },
      })
    )
  );

  return apiOk({ ok: true });
}
