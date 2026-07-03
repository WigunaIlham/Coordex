export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-muted/40 px-4 py-10">
      {/* Ambient background: subtle emerald & amber blobs give the auth screen
          a warm branded feel without hurting contrast. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 -top-40 h-96 w-96 rounded-full bg-primary/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-amber-200/40 blur-3xl"
      />
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2 text-center">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-primary-foreground shadow-md shadow-primary/20">
            C
          </span>
          <div className="text-left leading-tight">
            <p className="text-base font-semibold">Coordex</p>
            <p className="text-[11px] text-muted-foreground">Sisdamas 2026</p>
          </div>
        </div>
        {children}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          © 2026 KKN Sisdamas. Semua hak dilindungi.
        </p>
      </div>
    </div>
  );
}
