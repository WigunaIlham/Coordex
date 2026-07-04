import { redirect } from "next/navigation";

// Old route — module was renamed to "Jadwal" with a konsumsi tab.
export default function KonsumsiRedirect() {
  redirect("/jadwal");
}
