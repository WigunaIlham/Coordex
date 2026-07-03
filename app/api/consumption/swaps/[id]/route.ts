import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { decideSwapSchema } from "@/lib/validators/consumption";
import { isAdminOrKetua } from "@/lib/permissions";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);

  const { id } = await params;
  const swap = await db.consumptionSwap.findUnique({
    where: { id },
    include: { duty: { include: { members: true } } },
  });
  if (!swap) return apiErr("Permintaan tidak ditemukan", 404);
  if (swap.status !== "PENDING") {
    return apiErr("Permintaan sudah diproses", 400);
  }

  const isTarget = swap.targetId === session.user.id;
  const isKetua = isAdminOrKetua(session.user.role);
  if (!isTarget && !isKetua) {
    return apiErr("Hanya target atau Ketua yang dapat memutuskan", 403);
  }

  const body = await req.json().catch(() => null);
  const parsed = decideSwapSchema.safeParse(body);
  if (!parsed.success) return apiErr("Status tidak valid", 400);

  if (parsed.data.status === "DITOLAK") {
    const updated = await db.consumptionSwap.update({
      where: { id },
      data: { status: "DITOLAK", approvedById: session.user.id },
    });
    return apiOk(updated);
  }

  // DISETUJUI: lakukan swap member di duty
  await db.$transaction(async (tx) => {
    // Remove requester from duty members, add target
    await tx.consumptionDutyMember.deleteMany({
      where: { dutyId: swap.dutyId, userId: swap.requesterId },
    });
    await tx.consumptionDutyMember.upsert({
      where: {
        dutyId_userId: { dutyId: swap.dutyId, userId: swap.targetId },
      },
      update: {},
      create: { dutyId: swap.dutyId, userId: swap.targetId },
    });
    await tx.consumptionSwap.update({
      where: { id },
      data: { status: "DISETUJUI", approvedById: session.user.id },
    });
  });

  return apiOk({ ok: true });
}
