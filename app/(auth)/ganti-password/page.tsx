import { redirect } from "next/navigation";

// Password change lives on /profil now. Redirect any stale bookmarks.
export default function GantiPasswordPage() {
  redirect("/profil");
}
