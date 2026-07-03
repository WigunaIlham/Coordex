import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { updateMinutesSchema } from "@/lib/validators/meeting";
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

  const body = await req.json().catch(() => null);
  const parsed = updateMinutesSchema.safeParse(body);
  if (!parsed.success) return apiErr("Input tidak valid", 400);

  const { id } = await params;
  const updated = await db.meeting.update({
    where: { id },
    data: { minutes: parsed.data.minutes },
    select: { id: true },
  });
  return apiOk(updated);
}
