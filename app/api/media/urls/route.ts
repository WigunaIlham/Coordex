import { apiErr, apiOk } from "@/lib/api";
import { auth } from "@/lib/auth";
import { STORAGE_BUCKETS } from "@/lib/constants";
import { db } from "@/lib/db";
import { createSignedUrl } from "@/lib/supabase";

export const runtime = "nodejs";

// Batch signed URLs for media thumbnails. See finance/receipts/urls for the
// same pattern — one client call instead of N per row.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return apiErr("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.ids)) return apiErr("Invalid payload", 400);
  const ids = (body.ids as unknown[])
    .filter((v): v is string => typeof v === "string")
    .slice(0, 200);
  if (ids.length === 0) return apiOk({});

  const rows = await db.mediaAsset.findMany({
    where: { id: { in: ids } },
    select: { id: true, fileUrl: true },
  });

  const entries = await Promise.all(
    rows.map(async (r) => {
      try {
        const url = await createSignedUrl(STORAGE_BUCKETS.MEDIA_ASSETS, r.fileUrl, 60 * 60);
        return [r.id, url] as const;
      } catch {
        return [r.id, null] as const;
      }
    }),
  );

  const map: Record<string, string | null> = {};
  for (const [id, url] of entries) map[id] = url;
  return apiOk(map);
}
