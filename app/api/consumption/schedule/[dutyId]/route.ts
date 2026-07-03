import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { overrideDutySchema } from "@/lib/validators/consumption";
import { isAdminOrKetua } from "@/lib/permissions";

export const runtime = "nodejs";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ dutyId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);
  if (!isAdminOrKetua(session.user.role)) return apiErr("Forbidden", 403);

  const body = await req.json().catch(() => null);
  const parsed = overrideDutySchema.safeParse(body);
  if (!parsed.success) return apiErr("Input tidak valid", 400);

  const { dutyId } = await params;
  const unique = Array.from(new Set(parsed.data.userIds));

  await db.$transaction(async (tx) => {
    await tx.consumptionDutyMember.deleteMany({ where: { dutyId } });
    await tx.consumptionDutyMember.createMany({
      data: unique.map((userId) => ({ dutyId, userId })),
    });
  });

  return apiOk({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ dutyId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);
  if (!isAdminOrKetua(session.user.role)) return apiErr("Forbidden", 403);

  const { dutyId } = await params;
  const exists = await db.consumptionDuty.findUnique({
    where: { id: dutyId },
    select: { id: true },
  });
  if (!exists) return apiErr("Jadwal tidak ditemukan", 404);
  // Members cascade via schema; swaps have no cascade so clear them
  // explicitly before removing the duty.
  await db.$transaction([
    db.consumptionSwap.deleteMany({ where: { dutyId } }),
    db.consumptionDuty.delete({ where: { id: dutyId } }),
  ]);
  return apiOk({ ok: true });
}
