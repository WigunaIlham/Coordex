import { apiErr } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  renderRabDocx,
  renderRabPdf,
  renderRabXlsx,
  type ExportRab,
} from "@/lib/services/rab-export";

export const runtime = "nodejs";

const CONTENT_TYPE = {
  pdf: "application/pdf",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
} as const;

type Format = keyof typeof CONTENT_TYPE;

function safeSlug(s: string) {
  return s
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .toLowerCase() || "rab";
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; format: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiErr("Unauthorized", 401);

    const { id, format } = await params;
    if (!(format in CONTENT_TYPE)) return apiErr("Format tidak didukung", 400);
    const fmt = format as Format;

    const rab = await db.rab.findUnique({
      where: { id },
      include: {
        createdBy: { select: { name: true } },
        categories: {
          orderBy: { order: "asc" },
          include: { items: { orderBy: { order: "asc" } } },
        },
      },
    });
    if (!rab) return apiErr("RAB tidak ditemukan", 404);

    const payload: ExportRab = {
      title: rab.title,
      description: rab.description,
      createdByName: rab.createdBy.name,
      createdAt: rab.createdAt,
      categories: rab.categories.map((c) => ({
        name: c.name,
        items: c.items.map((it) => ({
          name: it.name,
          volume: it.volume.toString(),
          unit: it.unit,
          unitPrice: it.unitPrice.toString(),
          notes: it.notes,
        })),
      })),
    };

    let buffer: Buffer;
    if (fmt === "pdf") buffer = await renderRabPdf(payload);
    else if (fmt === "xlsx") buffer = await renderRabXlsx(payload);
    else buffer = await renderRabDocx(payload);

    const filename = `RAB-${safeSlug(rab.title)}.${fmt}`;
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": CONTENT_TYPE[fmt],
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (err) {
    console.error("[api/rab export]", err);
    const msg = err instanceof Error ? err.message : "Gagal export";
    return apiErr(msg, 500, "EXPORT_FAILED");
  }
}
