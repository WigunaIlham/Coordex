import { apiErr } from "@/lib/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { renderDocumentDocx } from "@/lib/services/documents/docx-renderer";
import { renderDocumentPdf } from "@/lib/services/documents/pdf-renderer";
import type { SupportedTemplate } from "@/lib/validators/document";

export const runtime = "nodejs";

function safeFileName(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);

  const { id } = await params;
  const doc = await db.generatedDocument.findUnique({ where: { id } });
  if (!doc) return apiErr("Dokumen tidak ditemukan", 404);

  const url = new URL(req.url);
  const format = (url.searchParams.get("format") ?? "pdf").toLowerCase();

  const formData = (doc.formData as Record<string, unknown>) ?? {};
  const template = doc.templateType as SupportedTemplate;

  // Shared extra payload: resolved attendees list, used by DAFTAR_HADIR (auto
  // from active team members) and NOTULEN_RAPAT (from user-picked checklist).
  // signatureUrl hanya ditumpahkan ke DAFTAR_HADIR — renderer memasangnya
  // sebagai gambar di kolom Tanda Tangan bila ada.
  let extra:
    | {
        attendees?: {
          name: string;
          nim?: string;
          signatureUrl?: string | null;
        }[];
      }
    | undefined;

  if (template === "DAFTAR_HADIR" || template === "NOTULEN_RAPAT") {
    // pesertaHadirIds is a checklist of userIds; resolve to names for the doc.
    // Fallback for legacy DAFTAR_HADIR docs (created before the checklist
    // existed): if no selection is stored, use the full active roster.
    const raw = formData["pesertaHadirIds"];
    const ids = Array.isArray(raw)
      ? raw.filter((v): v is string => typeof v === "string")
      : [];
    const includeSignature = template === "DAFTAR_HADIR";
    if (ids.length > 0) {
      // Untuk DAFTAR_HADIR, admin (SUPER_ADMIN) tidak pernah masuk tabel
      // — walau ID-nya sempat tersimpan di formData lama.
      const members = await db.user.findMany({
        where: {
          id: { in: ids },
          ...(template === "DAFTAR_HADIR"
            ? { role: { not: "SUPER_ADMIN" } }
            : {}),
        },
        select: {
          name: true,
          studentId: true,
          ...(includeSignature ? { signatureUrl: true } : {}),
        },
        orderBy: { name: "asc" },
      });
      extra = {
        attendees: members.map((m) => ({
          name: m.name,
          nim: m.studentId ?? undefined,
          signatureUrl: includeSignature
            ? ((m as { signatureUrl?: string | null }).signatureUrl ?? null)
            : undefined,
        })),
      };
    } else if (template === "DAFTAR_HADIR") {
      // Admin (SUPER_ADMIN) tidak ikut daftar hadir kegiatan lapangan.
      const members = await db.user.findMany({
        where: { isActive: true, role: { not: "SUPER_ADMIN" } },
        select: { name: true, studentId: true, signatureUrl: true },
        orderBy: { name: "asc" },
      });
      extra = {
        attendees: members.map((m) => ({
          name: m.name,
          nim: m.studentId ?? undefined,
          signatureUrl: m.signatureUrl ?? null,
        })),
      };
    } else {
      extra = { attendees: [] };
    }
  }

  const baseFileName = safeFileName(doc.title || doc.templateType);

  if (format === "docx") {
    const buffer = await renderDocumentDocx(template, formData, extra);
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${baseFileName}.docx"`,
      },
    });
  }

  const buffer = await renderDocumentPdf(template, formData, extra);
  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${baseFileName}.pdf"`,
    },
  });
}
