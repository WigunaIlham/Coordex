import { redirect } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { PagePoller } from "@/components/shared/page-poller";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAdminOrKetua } from "@/lib/permissions";
import { FinanceClient } from "./finance-client";

export default async function KeuanganPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const canWrite =
    session.user.role === "BENDAHARA" || isAdminOrKetua(session.user.role);

  const [transactions, aggregations] = await Promise.all([
    db.financialTransaction.findMany({
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: {
        recordedBy: { select: { id: true, name: true, role: true } },
      },
      take: 200,
    }),
    db.financialTransaction.groupBy({
      by: ["type"],
      _sum: { amount: true },
    }),
  ]);

  const pemasukan = Number(
    aggregations.find((a) => a.type === "PEMASUKAN")?._sum.amount ?? 0
  );
  const pengeluaran = Number(
    aggregations.find((a) => a.type === "PENGELUARAN")?._sum.amount ?? 0
  );

  // Receipt thumbnails are fetched lazily on the client — signing many URLs
  // during SSR made the page slow (14+ round-trips to Supabase per load).
  const serialised = transactions.map((t) => ({
    ...t,
    amount: Number(t.amount),
    date: t.date.toISOString(),
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    receiptSignedUrl: null as string | null,
  }));

  return (
    <div>
      <PagePoller />
      <PageHeader
        title="Keuangan"
        description="Catat transaksi dan pantau saldo tim secara real-time."
      />
      <FinanceClient
        initialTransactions={serialised}
        summary={{ pemasukan, pengeluaran, saldo: pemasukan - pengeluaran }}
        canWrite={canWrite}
      />
    </div>
  );
}
