-- Kolom TTD digital per user. Muncul otomatis di dokumen yang butuh tanda
-- tangan (contoh: daftar hadir) sebagai gambar PNG transparan.

ALTER TABLE "users"
  ADD COLUMN "signatureUrl" TEXT;
