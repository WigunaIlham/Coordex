import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let _supabaseAdmin: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdmin() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Supabase env vars (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) belum di-set"
    );
  }
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _supabaseAdmin;
}

export async function uploadToBucket(
  bucket: string,
  filePath: string,
  body: Buffer | Blob | ArrayBuffer,
  contentType: string
) {
  const client = getSupabaseAdmin();
  const { error } = await client.storage
    .from(bucket)
    .upload(filePath, body, {
      contentType,
      upsert: false,
    });
  if (error) {
    throw new Error(`Gagal upload ke ${bucket}: ${error.message}`);
  }
  return { path: filePath };
}

export function getPublicUrl(bucket: string, path: string) {
  const client = getSupabaseAdmin();
  const { data } = client.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// Idempotent: memastikan bucket ada dan public. Dipakai untuk avatar
// supaya <img src> bisa langsung load tanpa perlu signed URL.
export async function ensurePublicBucket(bucket: string) {
  const client = getSupabaseAdmin();
  const { data: existing, error } = await client.storage.getBucket(bucket);
  if (error && !existing) {
    await client.storage.createBucket(bucket, { public: true });
    return;
  }
  if (existing && !existing.public) {
    await client.storage.updateBucket(bucket, { public: true });
  }
}

export async function createSignedUrl(
  bucket: string,
  path: string,
  expiresInSeconds = 3600
) {
  const client = getSupabaseAdmin();
  const { data, error } = await client.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);
  if (error || !data?.signedUrl) {
    throw new Error(`Gagal membuat signed URL: ${error?.message ?? "unknown"}`);
  }
  return data.signedUrl;
}

export async function deleteFromBucket(bucket: string, path: string) {
  const client = getSupabaseAdmin();
  await client.storage.from(bucket).remove([path]);
}

export function buildFilePath(prefix: string, filename: string) {
  const ext = filename.includes(".") ? filename.split(".").pop() : "bin";
  const safe = filename
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 40);
  const stamp = Date.now();
  return `${prefix}/${stamp}-${safe}.${ext}`;
}
