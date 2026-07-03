import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { STORAGE_BUCKETS } from "@/lib/constants";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { createSignedUrl, deleteFromBucket } from "@/lib/supabase";
import { updateMediaSchema } from "@/lib/validators/media";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);
  const { id } = await params;
  const asset = await db.mediaAsset.findUnique({ where: { id } });
  if (!asset) return apiErr("Tidak ditemukan", 404);
  try {
    const signedUrl = await createSignedUrl(
      STORAGE_BUCKETS.MEDIA_ASSETS,
      asset.fileUrl,
      60 * 60,
    );
    return apiOk({ ...asset, signedUrl });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal membuat URL";
    return apiErr(msg, 500);
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);
  if (!hasPermission(session.user.role, "media.crud")) {
    return apiErr("Tidak diizinkan", 403);
  }
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updateMediaSchema.safeParse(body);
  if (!parsed.success) return apiErr("Input tidak valid", 400);

  // If moving to APPROVED, stamp approver.
  const extra =
    parsed.data.status === "APPROVED"
      ? { approvedById: session.user.id }
      : {};

  const updated = await db.mediaAsset.update({
    where: { id },
    data: { ...parsed.data, ...extra },
  });
  return apiOk(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);
  if (!hasPermission(session.user.role, "media.crud")) {
    return apiErr("Tidak diizinkan", 403);
  }
  const { id } = await params;
  const asset = await db.mediaAsset.findUnique({ where: { id } });
  if (!asset) return apiErr("Tidak ditemukan", 404);

  await db.mediaAsset.delete({ where: { id } });
  // Fire-and-forget: don't block response on storage cleanup.
  deleteFromBucket(STORAGE_BUCKETS.MEDIA_ASSETS, asset.fileUrl).catch(() => undefined);
  return apiOk({ ok: true });
}
