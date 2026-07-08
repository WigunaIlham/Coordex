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

type MemberRow = {
  name: string;
  studentId: string | null;
  signatureUrl?: string | null;
};

// Fetch signature bytes and convert to a data URI. This runs at request time
// on Node runtime, so the renderers never touch the network — makes PDF/DOCX
// generation deterministic (no half-broken images when Supabase is slow).
async function fetchSignatureDataUri(
  url: string | null | undefined,
): Promise<string | null> {
  if (!url) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "image/png";
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:${type};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

// Query members with signatureUrl. If the DB column isn't there yet (fresh
// deploy where migration hasn't run), fall back to a query without it — the
// documents still render, just without embedded TTD.
async function findMembersWithOptionalSignature(
  where: Parameters<typeof db.user.findMany>[0] extends
    | { where?: infer W }
    | undefined
    ? W
    : never,
  wantSignature: boolean,
): Promise<MemberRow[]> {
  if (!wantSignature) {
    const rows = await db.user.findMany({
      where,
      select: { name: true, studentId: true },
      orderBy: { name: "asc" },
    });
    return rows.map((r) => ({ ...r, signatureUrl: null }));
  }
  try {
    const rows = await db.user.findMany({
      where,
      select: { name: true, studentId: true, signatureUrl: true },
      orderBy: { name: "asc" },
    });
    return rows;
  } catch (err) {
    // Kolom belum ada → migration belum jalan. Log dan lanjut tanpa TTD.
    console.warn(
      "[download] signatureUrl select gagal, fallback tanpa TTD:",
      err instanceof Error ? err.message : err,
    );
    const rows = await db.user.findMany({
      where,
      select: { name: true, studentId: true },
      orderBy: { name: "asc" },
    });
    return rows.map((r) => ({ ...r, signatureUrl: null }));
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
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
  // signature is a base64 data URI — renderers embed it directly, no network.
  type AbsentStatus = "IZIN" | "SAKIT" | "TANPA_KETERANGAN";
  let extra:
    | {
        attendees?: {
          name: string;
          nim?: string;
          signature?: string | null;
        }[];
        absentees?: {
          name: string;
          nim?: string;
          status: AbsentStatus;
          keterangan?: string;
        }[];
      }
    | undefined;

  if (template === "DAFTAR_HADIR" || template === "NOTULEN_RAPAT") {
    const raw = formData["pesertaHadirIds"];
    const ids = Array.isArray(raw)
      ? raw.filter((v): v is string => typeof v === "string")
      : [];
    const wantSignature = template === "DAFTAR_HADIR";
    let members: MemberRow[] = [];

    if (ids.length > 0) {
      members = await findMembersWithOptionalSignature(
        {
          id: { in: ids },
          ...(template === "DAFTAR_HADIR"
            ? { role: { not: "SUPER_ADMIN" } }
            : {}),
        },
        wantSignature,
      );
    } else if (template === "DAFTAR_HADIR") {
      members = await findMembersWithOptionalSignature(
        { isActive: true, role: { not: "SUPER_ADMIN" } },
        wantSignature,
      );
    }

    // Pre-fetch semua TTD paralel supaya renderer tinggal embed base64.
    const signatures = wantSignature
      ? await Promise.all(
          members.map((m) => fetchSignatureDataUri(m.signatureUrl)),
        )
      : members.map(() => null);

    // Resolve daftar tidak hadir (khusus DAFTAR_HADIR).
    let absentees:
      | {
          name: string;
          nim?: string;
          status: AbsentStatus;
          keterangan?: string;
        }[]
      | undefined;
    if (template === "DAFTAR_HADIR") {
      const rawAbs = formData["absentees"];
      const entries = Array.isArray(rawAbs)
        ? rawAbs.filter(
            (
              v,
            ): v is {
              userId: string;
              status: AbsentStatus;
              keterangan?: string;
            } =>
              !!v &&
              typeof v === "object" &&
              typeof (v as { userId?: unknown }).userId === "string" &&
              typeof (v as { status?: unknown }).status === "string",
          )
        : [];
      if (entries.length > 0) {
        const absentUsers = await db.user.findMany({
          where: {
            id: { in: entries.map((e) => e.userId) },
            role: { not: "SUPER_ADMIN" },
          },
          select: { id: true, name: true, studentId: true },
        });
        const map = new Map(absentUsers.map((u) => [u.id, u]));
        absentees = entries
          .map((e) => {
            const u = map.get(e.userId);
            if (!u) return null;
            return {
              name: u.name,
              nim: u.studentId ?? undefined,
              status: e.status,
              keterangan: e.keterangan?.trim() || undefined,
            };
          })
          .filter((v): v is NonNullable<typeof v> => v !== null)
          // Urutan tetap konsisten (alfabet nama) supaya dokumen deterministik.
          .sort((a, b) => a.name.localeCompare(b.name));
      }
    }

    extra = {
      attendees: members.map((m, i) => ({
        name: m.name,
        nim: m.studentId ?? undefined,
        signature: signatures[i],
      })),
      absentees,
    };
  }

  const baseFileName = safeFileName(doc.title || doc.templateType);

  try {
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
  } catch (err) {
    console.error("[download] render gagal:", err);
    const msg = err instanceof Error ? err.message : "Gagal render dokumen";
    return apiErr(msg, 500, "RENDER_FAILED");
  }
}
