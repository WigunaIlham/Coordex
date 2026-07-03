import { redirect } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { MediaClient } from "./media-client";

export default async function MediaPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!hasPermission(session.user.role, "media.crud")) redirect("/dashboard");

  const items = await db.mediaAsset.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      uploadedBy: { select: { id: true, name: true, avatarUrl: true } },
      approvedBy: { select: { id: true, name: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title="Aset Media"
        description="Dokumentasi foto & video kegiatan. Alur: Draft → Editing → Approved → Published."
      />
      <MediaClient
        initial={items.map((m) => ({
          id: m.id,
          type: m.type,
          title: m.title,
          caption: m.caption,
          event: m.event,
          status: m.status,
          uploadedBy: m.uploadedBy,
          approvedBy: m.approvedBy,
          createdAt: m.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
