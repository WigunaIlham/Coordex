// Workload calculation (Appendix A)
export const WORKLOAD_CAPACITY = 40; // points per week

export const PRIORITY_MULTIPLIERS = {
  LOW: 1.0,
  MEDIUM: 1.5,
  HIGH: 2.0,
  URGENT: 3.0,
} as const;

// Stress index bands (Appendix B)
export const STRESS_BANDS = {
  RENDAH_MAX: 33,
  SEDANG_MAX: 66,
} as const;

// Activity categories
export const ACTIVITY_CATEGORIES = [
  "Kegiatan",
  "Rapat",
  "Publikasi",
  "Keuangan",
  "Logistik",
  "Lainnya",
] as const;

// File upload constraints
export const UPLOAD_LIMITS = {
  TASK_ATTACHMENT_MAX_BYTES: 10 * 1024 * 1024,
  TASK_ATTACHMENT_TYPES: [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],
  RECEIPT_MAX_BYTES: 5 * 1024 * 1024,
  RECEIPT_TYPES: ["image/jpeg", "image/png", "application/pdf"],
  AVATAR_MAX_BYTES: 2 * 1024 * 1024,
  AVATAR_TYPES: ["image/jpeg", "image/png", "image/webp"],
  SIGNATURE_MAX_BYTES: 1 * 1024 * 1024,
  SIGNATURE_TYPES: ["image/png", "image/jpeg", "image/webp"],
  KNOWLEDGE_MAX_BYTES: 25 * 1024 * 1024,
} as const;

// Storage buckets (Supabase)
export const STORAGE_BUCKETS = {
  AVATARS: "avatars",
  SIGNATURES: "signatures",
  TASK_ATTACHMENTS: "task-attachments",
  RECEIPTS: "receipts",
  DOCUMENTS: "documents",
  KNOWLEDGE_FILES: "knowledge-files",
  MEDIA_ASSETS: "media-assets",
} as const;

// Document template field definitions (Appendix C).
// Field type `attendees` = checklist dari anggota tim aktif; disimpan sebagai
// array of userId, di-resolve ke nama saat generate.
export const DOCUMENT_TEMPLATE_FIELDS = {
  SURAT_UNDANGAN: [
    {key: "nomorSurat", label: "Nomor Surat", type: "text", required: true},
    {key: "lampiran", label: "Lampiran", type: "text", required: false},
    {key: "tanggal", label: "Tanggal Surat", type: "date", required: true},
    {key: "perihal", label: "Perihal", type: "text", required: true},
    {
      key: "kepada",
      label: "Kepada Yth. (nama & jabatan)",
      type: "textarea",
      required: true,
    },
    {key: "diTempat", label: "di", type: "text", required: false},
    {
      key: "isiUndangan",
      label: "Pengantar / Isi Undangan",
      type: "textarea",
      required: true,
    },
    {key: "hariKegiatan", label: "Hari Kegiatan", type: "text", required: true},
    {
      key: "tanggalKegiatan",
      label: "Tanggal Kegiatan",
      type: "date",
      required: true,
    },
    {key: "waktuKegiatan", label: "Waktu (WIB)", type: "text", required: true},
    {
      key: "tempatKegiatan",
      label: "Tempat Kegiatan",
      type: "text",
      required: true,
    },
    {key: "acaraKegiatan", label: "Acara", type: "text", required: true},
    {key: "namaKetua", label: "Nama Ketua", type: "text", required: true},
    {key: "nimKetua", label: "NIM Ketua", type: "text", required: true},
    {
      key: "namaSekretaris",
      label: "Nama Sekretaris",
      type: "text",
      required: false,
    },
    {
      key: "nimSekretaris",
      label: "NIM Sekretaris",
      type: "text",
      required: false,
    },
  ],
  NOTULEN_RAPAT: [
    {key: "judulRapat", label: "Judul Rapat", type: "text", required: true},
    {key: "tanggal", label: "Tanggal", type: "date", required: true},
    {key: "waktuMulai", label: "Waktu Mulai", type: "text", required: false},
    {
      key: "waktuSelesai",
      label: "Waktu Selesai",
      type: "text",
      required: false,
    },
    {key: "tempat", label: "Tempat", type: "text", required: true},
    {
      key: "pemimpinRapat",
      label: "Pemimpin Rapat",
      type: "text",
      required: true,
    },
    {key: "notulis", label: "Notulis", type: "text", required: true},
    {
      key: "pesertaHadirIds",
      label: "Peserta Hadir",
      type: "attendees",
      required: true,
    },
    {
      key: "pesertaTidakHadir",
      label: "Peserta Tidak Hadir (opsional)",
      type: "textarea",
      required: false,
    },
    {key: "agenda", label: "Agenda Rapat", type: "textarea", required: true},
    {key: "pembahasan", label: "Pembahasan", type: "textarea", required: true},
    {
      key: "hasilRapat",
      label: "Keputusan / Kesimpulan",
      type: "textarea",
      required: true,
    },
    {
      key: "tindakLanjut",
      label: "Tindak Lanjut",
      type: "textarea",
      required: false,
    },
  ],
  DAFTAR_HADIR: [
    {key: "namaKegiatan", label: "Nama Kegiatan", type: "text", required: true},
    {key: "tanggal", label: "Tanggal", type: "date", required: true},
    {key: "waktu", label: "Waktu", type: "text", required: false},
    {key: "tempat", label: "Tempat", type: "text", required: true},
    {
      key: "penyelenggara",
      label: "Penyelenggara",
      type: "text",
      required: false,
    },
    {
      key: "pesertaHadirIds",
      label: "Peserta Hadir",
      type: "attendees",
      required: true,
    },
  ],
  LPJ: [
    {key: "namaKegiatan", label: "Nama Kegiatan", type: "text", required: true},
    {
      key: "landasan",
      label: "Landasan / Dasar Pelaksanaan",
      type: "textarea",
      required: false,
    },
    {key: "tujuan", label: "Tujuan Kegiatan", type: "textarea", required: true},
    {key: "sasaran", label: "Sasaran", type: "text", required: true},
    {key: "waktu", label: "Waktu Pelaksanaan", type: "text", required: true},
    {key: "tempat", label: "Tempat", type: "text", required: true},
    {key: "peserta", label: "Jumlah Peserta", type: "text", required: true},
    {
      key: "susunanPanitia",
      label: "Susunan Panitia",
      type: "textarea",
      required: false,
    },
    {
      key: "uraianKegiatan",
      label: "Uraian Kegiatan",
      type: "textarea",
      required: true,
    },
    {
      key: "hambatan",
      label: "Hambatan / Kendala",
      type: "textarea",
      required: false,
    },
    {key: "evaluasi", label: "Evaluasi", type: "textarea", required: true},
    {
      key: "rekomendasi",
      label: "Rekomendasi",
      type: "textarea",
      required: false,
    },
    {
      key: "totalPemasukan",
      label: "Total Pemasukan (Rp)",
      type: "number",
      required: false,
    },
    {
      key: "totalPengeluaran",
      label: "Total Pengeluaran (Rp)",
      type: "number",
      required: false,
    },
    {
      key: "namaKetua",
      label: "Nama Ketua Pelaksana",
      type: "text",
      required: true,
    },
    {key: "nimKetua", label: "NIM Ketua", type: "text", required: true},
    {
      key: "namaSekretaris",
      label: "Nama Sekretaris",
      type: "text",
      required: false,
    },
    {
      key: "nimSekretaris",
      label: "NIM Sekretaris",
      type: "text",
      required: false,
    },
  ],
} as const;

// Header institusi untuk kop surat. Bisa di-override lewat env kalau tim ingin
// menyesuaikan universitas / lokasi.
export const DOCUMENT_HEADER = {
  university: "UNIVERSITAS ISLAM NEGERI SUNAN GUNUNG DJATI",
  city: "BANDUNG",
  program: "KULIAH KERJA NYATA SISDAMAS 2026",
  team: "KELOMPOK KKN SISDAMAS - JAMALIGHTS 206",
  location: "Kabupaten Bandung, Jawa Barat",
  email: "kkn.sisdamas@uinsgd.ac.id",
} as const;
