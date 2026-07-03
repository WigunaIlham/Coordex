import { z } from "zod";

export const TransactionTypeEnum = z.enum(["PEMASUKAN", "PENGELUARAN"]);

export const createTransactionSchema = z.object({
  type: TransactionTypeEnum,
  category: z.string().min(1, "Kategori wajib").max(60),
  amount: z.coerce.number().positive("Nominal harus positif"),
  description: z.string().min(1, "Deskripsi wajib").max(2000),
  date: z
    .string()
    .date()
    .or(z.string().datetime({ offset: true }))
    .transform((v) => new Date(v))
    .refine((d) => d.getTime() <= Date.now() + 86_400_000, "Tanggal tidak boleh di masa depan"),
});

export const updateTransactionSchema = createTransactionSchema.partial();

export const transactionQuerySchema = z.object({
  type: TransactionTypeEnum.optional(),
  category: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const FINANCE_CATEGORIES = [
  "Konsumsi",
  "Transportasi",
  "ATK & Cetak",
  "Sewa Tempat",
  "Honorarium",
  "Akomodasi",
  "Dana KKN",
  "Donasi",
  "Iuran Anggota",
  "Lainnya",
] as const;
