import { revalidateTag } from "next/cache";

import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import {
  createTransactionSchema,
  transactionQuerySchema,
} from "@/lib/validators/finance";

export const runtime = "nodejs";

function canWrite(role: string) {
  return role === "BENDAHARA" || role === "KETUA";
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);

  const url = new URL(req.url);
  const parsed = transactionQuerySchema.safeParse(
    Object.fromEntries(url.searchParams)
  );
  if (!parsed.success) return apiErr("Query tidak valid", 400);

  const { type, category, startDate, endDate } = parsed.data;
  const where: Prisma.FinancialTransactionWhereInput = {};
  if (type) where.type = type;
  if (category) where.category = category;
  if (startDate || endDate) {
    where.date = {
      ...(startDate ? { gte: new Date(startDate) } : {}),
      ...(endDate ? { lte: new Date(endDate) } : {}),
    };
  }

  const items = await db.financialTransaction.findMany({
    where,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    include: {
      recordedBy: { select: { id: true, name: true, role: true } },
    },
  });
  return apiOk(items, { total: items.length });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);
  if (!canWrite(session.user.role)) {
    return apiErr("Hanya Bendahara atau Ketua yang dapat input transaksi", 403);
  }

  const body = await req.json().catch(() => null);
  const parsed = createTransactionSchema.safeParse(body);
  if (!parsed.success) {
    return apiErr(parsed.error.issues[0]?.message ?? "Input tidak valid", 400);
  }

  const created = await db.financialTransaction.create({
    data: {
      ...parsed.data,
      recordedById: session.user.id,
    },
    include: {
      recordedBy: { select: { id: true, name: true, role: true } },
    },
  });
  // Invalidate cache dashboard supaya semua user langsung lihat saldo baru
  // tanpa nunggu 10s TTL.
  revalidateTag("finance", "seconds");
  revalidateTag("dashboard", "seconds");
  return apiOk(created, undefined, { status: 201 });
}
