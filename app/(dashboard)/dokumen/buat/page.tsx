import { redirect } from "next/navigation";

// Kept for backward-compat bookmarks; the create flow now lives inside a
// modal on /dokumen. Redirect so no one lands on a dead page.
export default function BuatDokumenPage() {
  redirect("/dokumen");
}
