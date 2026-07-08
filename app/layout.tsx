import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { LegacyBrowserGuard } from "@/components/legacy-browser-guard";
import { ThemeScript } from "@/components/theme/theme-script";
import { Providers } from "./providers";
import "./globals.css";

// `swap` avoids invisible text during font load (FOIT). Preloading is left on
// only for the sans face — the mono font is rare enough that eagerly downloading
// it would waste bytes on the initial page.
const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "Coordex",
  description: "Sistem operasional tim KKN Sisdamas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Runs first: swap in a static "please update" overlay on browsers
            below our baseline before the main bundle fails to parse. */}
        <LegacyBrowserGuard />
        {/* Sync theme + color scheme before hydration so users never see a
            flash of the wrong palette. Must live in <head> and run inline. */}
        <ThemeScript />
      </head>
      <body className="min-h-full bg-background text-foreground">
        {/* Skip-link for keyboard users: jump past nav to main content. */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground focus:shadow-md"
        >
          Lompat ke konten
        </a>
        <Providers>{children}</Providers>
        {/* Toasts sit above the mobile bottom nav (safe-area aware) and drop
            to the standard top-right on desktop where they don't obscure work. */}
        <Toaster
          richColors
          position="top-right"
          mobileOffset={{ bottom: 84 }}
        />
      </body>
    </html>
  );
}
