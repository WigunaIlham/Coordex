import { redirect } from "next/navigation";
import Link from "next/link";
import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  FileText,
  Frown,
  GraduationCap,
  ListChecks,
  MessagesSquare,
  Route as RouteIcon,
  ShieldAlert,
  Sparkles,
  Users2,
  Utensils,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { ROLE_LABELS } from "@/components/layout/role-label";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import type { Role } from "@/lib/generated/prisma/client";

type Guide = {
  icon: LucideIcon;
  title: string;
  href: string;
  intro: string;
  steps: string[];
  tips?: string[];
};

const GUIDES: Guide[] = [
  {
    icon: ClipboardList,
    title: "Dashboard",
    href: "/dashboard",
    intro: "Titik awal setiap kali kamu login. Semua ringkasan tim ada di sini.",
    steps: [
      "Buka menu Dashboard di sidebar atau navbar bawah.",
      'Lihat KPI di atas: "Tugas Aktif" (personal + tim), "Rapat", "Saldo KKN" (Ketua), dan "Indeks Stres Tim" (Ketua).',
      "Scroll ke bawah untuk melihat Aktivitas Terbaru, Rapat Mendatang, dan jadwal Konsumsi + Piket hari ini.",
      "Klik kartu apapun untuk masuk ke halaman detailnya.",
    ],
    tips: [
      "Halaman ini auto-refresh setiap 30 detik — tidak perlu reload manual.",
    ],
  },
  {
    icon: ListChecks,
    title: "Tugas (Kanban)",
    href: "/tugas",
    intro: "Papan kanban 4 kolom: To Do → In Progress → Review → Done.",
    steps: [
      'Buka menu "Tugas".',
      'Klik tombol "Tugas Baru" (kanan atas) untuk membuat tugas: judul, deskripsi, prioritas, poin, tenggat, dan siapa yang ditugaskan.',
      "Geser (drag) kartu antar kolom untuk update status. Di HP: tap-tahan ~200ms lalu geser.",
      "Klik kartu untuk lihat detail. Edit / hapus dari sini (Ketua/Admin bisa hapus tugas orang lain).",
      "Filter dengan search box, filter anggota, dan filter prioritas di toolbar atas.",
    ],
    tips: [
      "Icon 🗑 sudut kanan-atas kartu = quick delete (khusus admin/ketua).",
      "Prioritas dan poin dipakai untuk hitung beban kerja di dashboard.",
    ],
  },
  {
    icon: ClipboardList,
    title: "Aktivitas",
    href: "/aktivitas",
    intro: "Timeline update tim — apapun yang dikerjakan hari ini diposting di sini.",
    steps: [
      'Klik "Tambah Update" untuk posting singkat.',
      'Isi judul, konten, kategori (Kegiatan/Rapat/Publikasi/dll), dan centang "Tandai Milestone" kalau penting.',
      'Klik "Pilih" untuk masuk ke mode multi-select — bisa hapus beberapa aktivitas sekaligus.',
      'Filter pakai kategori, penulis, atau "Milestone saja" di toolbar.',
    ],
    tips: [
      "Update aktivitas jadi bahan mentah LPJ nanti — jangan malas posting.",
    ],
  },
  {
    icon: RouteIcon,
    title: "Timeline Divisi",
    href: "/timeline",
    intro: "Peta jalan program per divisi dengan progress otomatis dari waktu.",
    steps: [
      "Buka Timeline dari sidebar.",
      "Kartu program dikelompokkan per divisi (PDD / Acara / HumLog / Konsumsi / Umum) — divisi otomatis dari role PIC.",
      "Bar warna = waktu berjalan otomatis, dihitung dari Tanggal Mulai → Target Tanggal.",
      "Garis tipis di atas bar = progress manual yang di-input tim (dari halaman Program).",
      "Kalau garis tipis di kiri bar warna → tim tertinggal jadwal (label 'Tertinggal').",
    ],
    tips: [
      "Untuk auto-progress jalan, program harus punya Tanggal Mulai + Target Tanggal (isi di /program).",
    ],
  },
  {
    icon: CalendarDays,
    title: "Rapat",
    href: "/rapat",
    intro: "Jadwalkan rapat, kelola absensi, dan tulis notulen.",
    steps: [
      'Klik "Rapat Baru" untuk buka modal buat rapat.',
      "Isi judul, waktu, lokasi (opsional), agenda (opsional), dan centang peserta yang diundang.",
      'Klik "Buat Rapat" — jadwal muncul di list.',
      "Klik rapat untuk buka detail. Di sana: ubah status (Terjadwal/Berlangsung/Selesai/Dibatalkan), tandai absensi peserta, tulis notulen.",
      'Rapat dengan status "Dibatalkan" tetap muncul di Riwayat sebagai catatan. Untuk hapus permanen, pakai "Zona Bahaya" di detail (Ketua/Admin saja).',
    ],
    tips: [
      "Admin/Super Admin otomatis dikeluarkan dari daftar peserta — admin bukan bagian operasional.",
    ],
  },
  {
    icon: Utensils,
    title: "Jadwal (Konsumsi + Piket)",
    href: "/jadwal",
    intro: "Rotasi tugas harian tim — dibagi tab Konsumsi dan Piket.",
    steps: [
      "Buka menu Jadwal → default tab Konsumsi.",
      "Kalender bulan penuh muncul; klik hari kosong untuk buat jadwal (khusus Ketua/Admin).",
      "Pilih tanggal + centang anggota yang bertugas → klik Buat Jadwal.",
      'Klik hari yang ada avatar untuk lihat detail. Anggota bisa klik "Ajukan Tukar" kalau tidak bisa bertugas.',
      "Ketua/Admin approve permintaan tukar via card di atas kalender.",
      'Ganti ke tab "Piket" untuk urus jadwal piket — sistemnya identik.',
    ],
    tips: [
      "Sel kalender hijau = kamu bertugas hari itu. Badge 'Anda' muncul di sudut.",
    ],
  },
  {
    icon: Wallet,
    title: "Keuangan",
    href: "/keuangan",
    intro: "Catat pemasukan/pengeluaran + upload struk. Semua anggota bisa input.",
    steps: [
      'Klik "Tambah Transaksi" — pilih tipe (Pemasukan/Pengeluaran), nominal, kategori, tanggal, dan deskripsi.',
      "Upload foto struk (opsional tapi disarankan).",
      "Kirim → status awal PENDING sampai Ketua approve.",
      "Ketua bisa approve/reject via halaman keuangan.",
      "Saldo real-time muncul di kartu atas dan di Dashboard KPI.",
    ],
  },
  {
    icon: FileText,
    title: "RAB (Rencana Anggaran Biaya)",
    href: "/rab",
    intro: "Susun rencana anggaran per kegiatan. Semua anggota bisa buat & edit RAB sendiri.",
    steps: [
      'Klik "RAB Baru" — kasih judul dan deskripsi kegiatan.',
      "Tambah kategori (misal Konsumsi, Transport, ATK) → tambah item dalam kategori (nama, satuan, quantity, harga).",
      "Total per kategori dan total keseluruhan dihitung otomatis.",
      'Klik "Ajukan" untuk kirim ke Ketua untuk di-approve.',
      "Setelah approve, RAB bisa di-export ke Excel/PDF untuk lampiran proposal.",
    ],
  },
  {
    icon: FileText,
    title: "Dokumen",
    href: "/dokumen",
    intro: "Generate surat & dokumen formal dari template.",
    steps: [
      'Klik "Buat Dokumen" untuk buka modal.',
      "Pilih template: Surat Undangan / Notulen Rapat / Daftar Hadir / LPJ.",
      "Isi form yang muncul (field tergantung template). Notulen Rapat pakai checklist peserta.",
      "Klik Generate PDF atau Generate DOCX — file otomatis ter-download.",
      "Dokumen tersimpan di list — bisa re-download atau hapus kapan saja.",
    ],
    tips: [
      "Kop surat sudah otomatis include: UIN Sunan Gunung Djati, program KKN Sisdamas, dan info lokasi.",
    ],
  },
  {
    icon: BookOpen,
    title: "Repositori",
    href: "/repositori",
    intro: "Pusat file semua dokumen tim (proposal, materi, foto, dll).",
    steps: [
      'Klik "Upload File" — pilih file dari device, kasih judul + kategori.',
      "File di-upload ke Supabase Storage; link private (butuh signed URL untuk download).",
      "Cari file pakai search bar atau filter kategori.",
      "Klik file untuk download. Hapus file (owner atau admin) via icon 🗑.",
    ],
  },
  {
    icon: MessagesSquare,
    title: "Q&A / Diskusi Tim",
    href: "/qna",
    intro: "Forum diskusi terbuka — pertanyaan, ide, atau bahas apapun.",
    steps: [
      'Klik "Tanya / Diskusi Baru" — kasih judul + detail.',
      "Setelah posting, anggota lain bisa jawab langsung di bawahnya.",
      "Kamu bisa hapus pertanyaan/jawaban sendiri (Ketua/Admin bisa hapus milik siapapun).",
      "Semua diskusi kelihatan oleh semua anggota — bukan private message.",
    ],
    tips: [
      "Kalau butuh diskusi rahasia (misal konflik personal), pakai menu Laporkan Masalah di sidebar bawah.",
    ],
  },
  {
    icon: Sparkles,
    title: "Program",
    href: "/program",
    intro: "Rencana program per siklus KKN — jadi data mentah untuk Timeline.",
    steps: [
      'Klik "Program Baru" — pilih siklus, isi nama, PIC (person in charge), Tanggal Mulai, Target Tanggal.',
      "Update progress manual (%) secara berkala di halaman ini.",
      "Progress muncul di Timeline sebagai garis tipis di atas bar waktu.",
      "Ubah status (Rencana / Berlangsung / Selesai / Dibatalkan) sesuai kondisi.",
    ],
  },
  {
    icon: Users2,
    title: "Pemangku Kepentingan",
    href: "/pemangku",
    intro: "CRM kecil untuk track komunikasi dengan pihak eksternal.",
    steps: [
      "Buat stakeholder baru: nama pihak/lembaga, tipe (RT/RW/tokoh/mitra), kontak.",
      "Catat riwayat kontak: kapan, siapa yang komunikasi, topik, hasil.",
      "Kolom kontak history berguna untuk continuity — anggota baru bisa lihat rekam jejak.",
    ],
  },
  {
    icon: Frown,
    title: "Survei Stres",
    href: "/stres",
    intro: "Survei wellbeing mingguan — bantu Ketua monitor kesehatan mental tim.",
    steps: [
      "Kalau ada survei aktif, notifikasi muncul di dashboard (banner biru).",
      "Klik untuk isi — 5-10 pertanyaan skala Likert. Anonim.",
      "Ketua lihat indeks stres tim di dashboard, tidak lihat jawaban individu.",
    ],
  },
  {
    icon: ShieldAlert,
    title: "Laporkan Masalah & Pusat Konflik",
    href: "/konflik/baru",
    intro: "Kalau ada masalah tim / konflik personal — laporkan lewat sini.",
    steps: [
      'Buka menu "Laporkan Masalah" di sidebar bawah.',
      "Isi kategori (Beban Kerja / Komunikasi / Konflik Personal / dll), judul, dan detail.",
      "Bisa dilaporkan anonim atau dengan nama.",
      "Ketua/Admin lihat di Pusat Konflik dan tindak lanjut (status: OPEN / DISKUSI / SELESAI).",
      "Catatan resolusi Ketua kelihatan oleh pelapor sebagai konfirmasi tindak lanjut.",
    ],
    tips: [
      "Jangan ragu pakai fitur ini — lebih baik ditangani dini daripada meledak di lapangan.",
    ],
  },
];

// Tips khusus per role — muncul di atas panduan modul.
const ROLE_TIPS: Partial<Record<Role, { title: string; body: string }[]>> = {
  SUPER_ADMIN: [
    {
      title: "Kelola Pengguna",
      body:
        "Sebagai Super Admin, buka /admin/pengguna untuk buat/edit/nonaktifkan akun. Reset password anggota juga dari sini.",
    },
    {
      title: "Kamu tidak masuk absensi",
      body:
        "Admin otomatis dikeluarkan dari daftar peserta rapat & rotasi konsumsi/piket. Kamu di sini sebagai operator, bukan anggota tim operasional.",
    },
  ],
  KETUA: [
    {
      title: "Approval flow",
      body:
        "Bendahara/anggota input transaksi → statusnya PENDING → kamu review + approve/reject. Sama untuk RAB dan permintaan tukar jadwal.",
    },
    {
      title: "Isu tim",
      body:
        "Perhatikan dashboard warning + Pusat Konflik. Semua laporan masalah masuk ke sini — respons cepat penting untuk moral tim.",
    },
  ],
  SEKRETARIS: [
    {
      title: "Dokumen otomatis",
      body:
        "Kamu paling sering pakai modul Dokumen — surat undangan, notulen, daftar hadir, LPJ. Semua sudah ada template resmi.",
    },
    {
      title: "Kelola rapat",
      body:
        "Buat rapat, kelola absensi, tulis notulen. Data notulen langsung bisa di-generate jadi PDF/DOCX resmi.",
    },
  ],
  BENDAHARA: [
    {
      title: "Alur keuangan harian",
      body:
        "Input transaksi + upload struk → tunggu approve Ketua → saldo real-time terupdate di dashboard.",
    },
    {
      title: "Susun RAB",
      body:
        "Buat RAB per kegiatan sebelum eksekusi. Setelah approve, export ke Excel untuk lampiran proposal.",
    },
  ],
};

export default async function TutorialPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const role = session.user.role;
  const roleLabel = ROLE_LABELS[role];
  const roleTips = ROLE_TIPS[role] ?? [];

  return (
    <div>
      <PageHeader
        title="Tutorial"
        description="Panduan step-by-step semua fitur Coordex."
      />

      <div className="mb-6 flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-medium">Selamat datang di Coordex!</p>
          <p className="mt-1 text-muted-foreground">
            Kamu login sebagai <Badge variant="outline">{roleLabel}</Badge>.
            Baca panduan role di bawah dulu, lalu scroll untuk panduan
            langkah-per-langkah setiap fitur.
          </p>
        </div>
      </div>

      {roleTips.length > 0 && (
        <section aria-labelledby="role-tips" className="mb-8">
          <h2
            id="role-tips"
            className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground"
          >
            <Sparkles className="h-4 w-4" /> Panduan khusus {roleLabel}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {roleTips.map((t) => (
              <Card key={t.title} className="border-primary/30 bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{t.title}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground">{t.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="modul-guides">
        <h2
          id="modul-guides"
          className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground"
        >
          <BookOpen className="h-4 w-4" /> Panduan per modul
        </h2>
        <div className="space-y-4">
          {GUIDES.map((g) => (
            <GuideCard key={g.title} guide={g} />
          ))}
        </div>
      </section>

      <div className="mt-10 rounded-lg border bg-muted/30 p-4 text-xs text-muted-foreground">
        Ada fitur yang belum jelas atau ada bug? Tanyakan di menu{" "}
        <Link
          href="/qna"
          className="font-medium text-primary underline underline-offset-2"
        >
          Q&A
        </Link>{" "}
        — semua anggota bisa lihat & jawab.
      </div>
    </div>
  );
}

function GuideCard({ guide }: { guide: Guide }) {
  const Icon = guide.icon;
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <CardTitle className="text-base leading-snug">
                {guide.title}
              </CardTitle>
              <Link
                href={guide.href}
                className="text-xs font-medium text-primary hover:underline"
              >
                Buka →
              </Link>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{guide.intro}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ol className="ml-1 space-y-2 text-sm">
          {guide.steps.map((s, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-primary/40 bg-primary/10 text-[10px] font-semibold text-primary">
                {i + 1}
              </span>
              <span className="text-foreground/90">{s}</span>
            </li>
          ))}
        </ol>
        {guide.tips && guide.tips.length > 0 && (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs dark:border-amber-500/40 dark:bg-amber-500/10">
            <p className="mb-1 font-medium text-amber-900 dark:text-amber-200">
              💡 Tips
            </p>
            <ul className="ml-4 list-disc space-y-1 text-amber-900/80 dark:text-amber-200/80">
              {guide.tips.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
