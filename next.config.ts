import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(import.meta.dirname),
  turbopack: {
    root: path.resolve(import.meta.dirname),
  },
  // Tree-shake barrel-file libraries so only the icons/utilities actually
  // imported land in the client bundle. Cuts dozens of KB off every page that
  // imports from these packages.
  //
  // Do NOT include @react-pdf/renderer here — its runtime relies on its full
  // module graph (fontkit, styles) and Next's import-optimiser breaks it in
  // production (`Cannot read properties of undefined (reading 'S')`).
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "recharts",
      "@dnd-kit/core",
      "@dnd-kit/sortable",
      "@dnd-kit/utilities",
    ],
  },
  // Server-only libs with native/binary dependencies that must stay outside
  // the bundle (kept as CommonJS requires at runtime).
  serverExternalPackages: [
    "@react-pdf/renderer",
    "@react-pdf/fontkit",
    "@react-pdf/pdfkit",
    "exceljs",
    "docx",
  ],
  compress: true,
  poweredByHeader: false,
};

export default nextConfig;
