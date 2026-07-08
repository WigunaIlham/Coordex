import { renderToBuffer } from "@react-pdf/renderer";

import type { SupportedTemplate } from "@/lib/validators/document";
import { DaftarHadirPDF } from "./pdf/daftar-hadir";
import { LPJPDF } from "./pdf/lpj";
import { NotulenRapatPDF } from "./pdf/notulen-rapat";
import { SuratUndanganPDF } from "./pdf/surat-undangan";

export async function renderDocumentPdf(
  template: SupportedTemplate,
  formData: Record<string, unknown>,
  extra?: {
    attendees?: {
      name: string;
      nim?: string;
      signature?: string | null;
    }[];
  },
): Promise<Buffer> {
  switch (template) {
    case "SURAT_UNDANGAN":
      // biome-ignore lint: cast to expected shape
      return renderToBuffer(<SuratUndanganPDF data={formData as never} />);
    case "NOTULEN_RAPAT":
      return renderToBuffer(
        <NotulenRapatPDF
          data={formData as never}
          attendees={extra?.attendees ?? []}
        />,
      );
    case "DAFTAR_HADIR":
      return renderToBuffer(
        <DaftarHadirPDF
          data={{
            namaKegiatan: String(formData.namaKegiatan ?? ""),
            tanggal: String(formData.tanggal ?? ""),
            waktu: formData.waktu ? String(formData.waktu) : undefined,
            tempat: String(formData.tempat ?? ""),
            penyelenggara: formData.penyelenggara
              ? String(formData.penyelenggara)
              : undefined,
            penyelenggaraLabel: formData.penyelenggaraLabel
              ? String(formData.penyelenggaraLabel)
              : undefined,
            attendees: extra?.attendees ?? [],
          }}
        />
      );
    case "LPJ":
      return renderToBuffer(<LPJPDF data={formData as never} />);
  }
}
