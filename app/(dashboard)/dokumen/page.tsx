import { redirect } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { DOCUMENT_TEMPLATE_FIELDS } from "@/lib/constants";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { DocumentsClient } from "./documents-client";

const TEMPLATE_LABELS = {
  SURAT_UNDANGAN: "Surat Undangan",
  NOTULEN_RAPAT: "Notulen Rapat",
  DAFTAR_HADIR: "Daftar Hadir",
  LPJ: "Laporan Pertanggungjawaban (LPJ)",
} as const;

export default async function DokumenPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [documents, members] = await Promise.all([
    db.generatedDocument.findMany({
      orderBy: { createdAt: "desc" },
      include: { createdBy: { select: { id: true, name: true } } },
    }),
    db.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, studentId: true, role: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const templates = (
    Object.keys(DOCUMENT_TEMPLATE_FIELDS) as (keyof typeof DOCUMENT_TEMPLATE_FIELDS)[]
  ).map((key) => ({
    type: key,
    label: TEMPLATE_LABELS[key],
    fields: DOCUMENT_TEMPLATE_FIELDS[key],
  }));

  return (
    <div>
      <PageHeader
        title="Generator Dokumen"
        description="Buat surat, notulen, daftar hadir, dan LPJ dalam hitungan menit."
      />
      <DocumentsClient
        initialDocuments={documents.map((d) => ({
          id: d.id,
          title: d.title,
          templateType: d.templateType,
          createdBy: d.createdBy,
          createdAt: d.createdAt.toISOString(),
        }))}
        templates={templates}
        members={members}
        currentUserId={session.user.id}
      />
    </div>
  );
}
