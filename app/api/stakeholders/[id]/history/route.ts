import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { addHistorySchema } from "@/lib/validators/stakeholder";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);
  if (!hasPermission(session.user.role, "pemangku.crud")) {
    return apiErr("Tidak diizinkan", 403);
  }
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = addHistorySchema.safeParse(body);
  if (!parsed.success) return apiErr("Input tidak valid", 400);

  const created = await db.contactHistory.create({
    data: {
      stakeholderId: id,
      summary: parsed.data.summary,
      date: parsed.data.date,
      recordedById: session.user.id,
    },
    include: { recordedBy: { select: { id: true, name: true } } },
  });
  return apiOk(created, undefined, { status: 201 });
}
