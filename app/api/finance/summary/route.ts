import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);

  const url = new URL(req.url);
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");

  const where =
    startDate || endDate
      ? {
          date: {
            ...(startDate ? { gte: new Date(startDate) } : {}),
            ...(endDate ? { lte: new Date(endDate) } : {}),
          },
        }
      : undefined;

  const aggregations = await db.financialTransaction.groupBy({
    by: ["type"],
    where,
    _sum: { amount: true },
    _count: { _all: true },
  });

  const pemasukan = aggregations.find((g) => g.type === "PEMASUKAN");
  const pengeluaran = aggregations.find((g) => g.type === "PENGELUARAN");
  const inSum = Number(pemasukan?._sum.amount ?? 0);
  const outSum = Number(pengeluaran?._sum.amount ?? 0);

  return apiOk({
    totalPemasukan: inSum,
    totalPengeluaran: outSum,
    saldo: inSum - outSum,
    pemasukanCount: pemasukan?._count._all ?? 0,
    pengeluaranCount: pengeluaran?._count._all ?? 0,
  });
}
