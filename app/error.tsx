"use client";

import { AlertOctagon, Home, RotateCw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { Button, buttonVariants } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surfaced to whatever logging is attached to the console in production.
    // eslint-disable-next-line no-console
    console.error("[app error boundary]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-destructive/10">
          <AlertOctagon className="h-7 w-7 text-destructive" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Terjadi kesalahan
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Kami tidak dapat menampilkan halaman ini. Anda bisa mencoba memuat ulang
          — kalau masalah berlanjut, hubungi Super Admin.
        </p>
        {error.digest && (
          <p className="mt-3 rounded-md bg-muted px-3 py-1.5 font-mono text-[10px] text-muted-foreground">
            ref: {error.digest}
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button size="sm" onClick={reset}>
            <RotateCw className="mr-2 h-4 w-4" /> Coba lagi
          </Button>
          <Link
            href="/dashboard"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Home className="mr-2 h-4 w-4" /> Ke Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
