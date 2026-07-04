import { revalidateTag } from "next/cache";

import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteFromBucket } from "@/lib/supabase";
import { updateTransactionSchema } from "@/lib/validators/finance";

export const runtime = "nodejs";

function canWrite(role: string) {
  return role === "BENDAHARA" || role === "KETUA";
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);

  const { id } = await params;
  const tx = await db.financialTransaction.findUnique({
    where: { id },
    include: {
      recordedBy: { select: { id: true, name: true, role: true } },
    },
  });
  if (!tx) return apiErr("Transaksi tidak ditemukan", 404);
  return apiOk(tx);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);
  if (!canWrite(session.user.role)) {
    return apiErr("Forbidden", 403);
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updateTransactionSchema.safeParse(body);
  if (!parsed.success) {
    return apiErr(parsed.error.issues[0]?.message ?? "Input tidak valid", 400);
  }

  const updated = await db.financialTransaction.update({
    where: { id },
    data: parsed.data,
    include: {
      recordedBy: { select: { id: true, name: true, role: true } },
    },
  });
  revalidateTag("finance", "seconds");
  revalidateTag("dashboard", "seconds");
  return apiOk(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);
  if (!canWrite(session.user.role)) {
    return apiErr("Forbidden", 403);
  }

  const { id } = await params;
  const existing = await db.financialTransaction.findUnique({ where: { id } });
  if (!existing) return apiErr("Transaksi tidak ditemukan", 404);

  await db.financialTransaction.delete({ where: { id } });

  if (existing.receiptUrl) {
    try {
      await deleteFromBucket("receipts", existing.receiptUrl);
    } catch {
      // best-effort cleanup
    }
  }

  revalidateTag("finance", "seconds");
  revalidateTag("dashboard", "seconds");
  return apiOk({ ok: true });
}
