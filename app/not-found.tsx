import { Home, MapPinOff } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-muted">
          <MapPinOff className="h-7 w-7 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Halaman tidak ditemukan
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          URL yang Anda cari mungkin sudah dipindah, dihapus, atau tidak pernah ada.
          Kembali ke dashboard untuk melanjutkan.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link href="/dashboard" className={buttonVariants({ size: "sm" })}>
            <Home className="mr-2 h-4 w-4" /> Ke Dashboard
          </Link>
          <Link
            href="/tugas"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Buka Tugas
          </Link>
        </div>
      </div>
    </div>
  );
}
