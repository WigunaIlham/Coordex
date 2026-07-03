import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { UPLOAD_LIMITS, STORAGE_BUCKETS } from "@/lib/constants";
import { db } from "@/lib/db";
import { buildFilePath, createSignedUrl, uploadToBucket } from "@/lib/supabase";
import { isAdminOrKetua } from "@/lib/permissions";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);
  if (session.user.role !== "BENDAHARA" && !isAdminOrKetua(session.user.role)) {
    return apiErr("Forbidden", 403);
  }

  const { id } = await params;
  const tx = await db.financialTransaction.findUnique({ where: { id } });
  if (!tx) return apiErr("Transaksi tidak ditemukan", 404);

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return apiErr("File wajib", 400);

  if (file.size > UPLOAD_LIMITS.RECEIPT_MAX_BYTES) {
    return apiErr("Ukuran file melebihi 5 MB", 400);
  }
  const accepted: readonly string[] = UPLOAD_LIMITS.RECEIPT_TYPES;
  if (!accepted.includes(file.type)) {
    return apiErr("Format file tidak didukung (JPG/PNG/PDF)", 400);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const path = buildFilePath("transactions", file.name);
  await uploadToBucket(STORAGE_BUCKETS.RECEIPTS, path, buffer, file.type);

  const updated = await db.financialTransaction.update({
    where: { id },
    data: { receiptUrl: path },
    select: { id: true, receiptUrl: true },
  });
  const signed = await createSignedUrl(STORAGE_BUCKETS.RECEIPTS, path, 3600);
  return apiOk({ ...updated, signedUrl: signed });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);
  const { id } = await params;
  const tx = await db.financialTransaction.findUnique({
    where: { id },
    select: { receiptUrl: true },
  });
  if (!tx?.receiptUrl) return apiErr("Tidak ada struk", 404);
  const url = await createSignedUrl(STORAGE_BUCKETS.RECEIPTS, tx.receiptUrl, 3600);
  return apiOk({ signedUrl: url });
}
