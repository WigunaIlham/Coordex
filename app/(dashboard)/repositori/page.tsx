import { redirect } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { KnowledgeClient } from "./knowledge-client";
import { isAdminOrKetua } from "@/lib/permissions";

export default async function RepositoriPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const files = await db.knowledgeFile.findMany({
    orderBy: { createdAt: "desc" },
    include: { uploadedBy: { select: { id: true, name: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Repositori Pengetahuan"
        description="Upload, organisasikan, dan cari semua dokumen tim di satu tempat."
      />
      <KnowledgeClient
        currentUserId={session.user.id}
        isKetua={isAdminOrKetua(session.user.role)}
        initialFiles={files.map((f) => ({
          ...f,
          createdAt: f.createdAt.toISOString(),
          updatedAt: f.updatedAt.toISOString(),
        }))}
      />
    </div>
  );
}
