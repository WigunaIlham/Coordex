import { redirect } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { auth } from "@/lib/auth";
import { ConflictForm } from "./conflict-form";

export default async function KonflikBaruPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Laporkan Masalah"
        description="Laporan Anda akan masuk ke Ketua. Anonim diaktifkan secara default."
      />
      <ConflictForm />
    </div>
  );
}
