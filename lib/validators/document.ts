import { z } from "zod";

import { DOCUMENT_TEMPLATE_FIELDS } from "@/lib/constants";

export const SupportedTemplateEnum = z.enum([
  "SURAT_UNDANGAN",
  "NOTULEN_RAPAT",
  "DAFTAR_HADIR",
  "LPJ",
]);

export type SupportedTemplate = z.infer<typeof SupportedTemplateEnum>;

export const generateDocumentSchema = z.object({
  templateType: SupportedTemplateEnum,
  title: z.string().min(1, "Judul wajib").max(200),
  formData: z.record(z.string(), z.unknown()),
});

export function validateFormDataForTemplate(
  template: SupportedTemplate,
  formData: Record<string, unknown>
) {
  const fields = DOCUMENT_TEMPLATE_FIELDS[template];
  for (const f of fields) {
    if (f.required) {
      const v = formData[f.key];
      if (v === undefined || v === null || (typeof v === "string" && v.trim() === "")) {
        return `Field "${f.label}" wajib diisi`;
      }
    }
  }
  return null;
}
