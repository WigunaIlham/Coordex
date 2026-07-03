import { apiErr } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  renderFinancePdf,
  renderFinanceXlsx,
  type FinanceExport,
} from "@/lib/services/finance-export";

export const runtime = "nodejs";

const CONTENT_TYPE = {
  pdf: "application/pdf",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
} as const;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ format: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiErr("Unauthorized", 401);

    const { format } = await params;
    if (!(format in CONTENT_TYPE)) return apiErr("Format tidak didukung", 400);

    const [transactions, aggregations] = await Promise.all([
      db.financialTransaction.findMany({
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        include: { recordedBy: { select: { name: true } } },
      }),
      db.financialTransaction.groupBy({
        by: ["type"],
        _sum: { amount: true },
      }),
    ]);

    const pemasukan = Number(
      aggregations.find((a) => a.type === "PEMASUKAN")?._sum.amount ?? 0,
    );
    const pengeluaran = Number(
      aggregations.find((a) => a.type === "PENGELUARAN")?._sum.amount ?? 0,
    );

    const payload: FinanceExport = {
      title: "Laporan Keuangan KKN",
      generatedAt: new Date(),
      summary: { pemasukan, pengeluaran, saldo: pemasukan - pengeluaran },
      transactions: transactions.map((t) => ({
        date: t.date,
        type: t.type,
        category: t.category,
        description: t.description,
        amount: Number(t.amount),
        recordedByName: t.recordedBy.name,
      })),
    };

    const buffer =
      format === "pdf"
        ? await renderFinancePdf(payload)
        : await renderFinanceXlsx(payload);

    const filename = `Keuangan-KKN-${new Date().toISOString().slice(0, 10)}.${format}`;
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": CONTENT_TYPE[format as keyof typeof CONTENT_TYPE],
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (err) {
    console.error("[api/finance export]", err);
    const msg = err instanceof Error ? err.message : "Gagal export";
    return apiErr(msg, 500, "EXPORT_FAILED");
  }
}
