import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { DOCUMENT_TEMPLATE_FIELDS } from "@/lib/constants";

export const runtime = "nodejs";

const TEMPLATE_LABELS: Record<string, string> = {
  SURAT_UNDANGAN: "Surat Undangan",
  NOTULEN_RAPAT: "Notulen Rapat",
  DAFTAR_HADIR: "Daftar Hadir",
  LPJ: "Laporan Pertanggungjawaban (LPJ)",
};

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);

  const templates = (
    Object.keys(DOCUMENT_TEMPLATE_FIELDS) as (keyof typeof DOCUMENT_TEMPLATE_FIELDS)[]
  ).map((key) => ({
    type: key,
    label: TEMPLATE_LABELS[key] ?? key,
    fields: DOCUMENT_TEMPLATE_FIELDS[key],
  }));
  return apiOk(templates);
}
