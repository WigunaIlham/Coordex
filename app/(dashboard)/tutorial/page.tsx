import { redirect } from "next/navigation";
import Link from "next/link";
import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  FileText,
  GraduationCap,
  ListChecks,
  MessageSquare,
  Route as RouteIcon,
  ShieldAlert,
  Sparkles,
  Users2,
  Wallet,
} from "lucide-react";

import { ROLE_LABELS } from "@/components/layout/role-label";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import type { Role } from "@/lib/generated/prisma/client";
import { cn } from "@/lib/utils";

type TutorialStep = {
  icon: typeof BookOpen;
  title: string;
  body: string;
  href?: string;
  hrefLabel?: string;
};

// Umum — semua role melihat kartu ini
const UMUM_STEPS: TutorialStep[] = [
  {
    icon: Sparkles,
    title: "Login pertama kali",
    body:
      "Gunakan email + password default (12345678). Setelah masuk, ganti password segera dari menu profil supaya akun kamu aman.",
    href: "/profil",
    hrefLabel: "Buka profil",
  },
  {
    icon: ClipboardList,
    title: "Dashboard = ringkasan harian",
    body:
      "Dashboard menampilkan tugas aktif kamu, rapat mendatang, jadwal konsumsi hari ini, dan aktivitas tim terbaru. Data otomatis refresh setiap 30 detik.",
    href: "/dashboard",
    hrefLabel: "Buka dashboard",
  },
  {
    icon: ListChecks,
    title: "Papan Tugas (Kanban)",
    body:
      "Semua tugas kamu ada di papan Tugas. Geser (drag) kartu antar kolom untuk ubah status: To Do → In Progress → Review → Done. Bisa juga di HP dengan tap-tahan.",
    href: "/tugas",
    hrefLabel: "Buka tugas",
  },
  {
    icon: CalendarDays,
    title: "Rapat & Jadwal",
    body:
      "Lihat jadwal rapat mendatang di /rapat. Jadwal konsumsi & piket rotasi ada di /jadwal — kamu bisa ajukan tukar jadwal kalau berhalangan.",
    href: "/rapat",
    hrefLabel: "Buka rapat",
  },
  {
    icon: ClipboardList,
    title: "Aktivitas — timeline tim",
    body:
      "Posting update singkat setelah selesai kegiatan (upload foto, catatan, atau milestone). Ini jadi jejak kolektif yang bisa dipakai buat LPJ nanti.",
    href: "/aktivitas",
    hrefLabel: "Buka aktivitas",
  },
  {
    icon: BookOpen,
    title: "Repositori — pusat file",
    body:
      "Semua file penting (proposal, undangan, LPJ, materi) di-share di Repositori. Cari dulu di sini sebelum tanya ke grup.",
    href: "/repositori",
    hrefLabel: "Buka repositori",
  },
  {
    icon: RouteIcon,
    title: "Timeline divisi",
    body:
      "Cek roadmap program per divisi (PDD, Acara, HumLog, Konsumsi) + progress-nya di halaman Timeline. Berguna buat lihat apa yang lagi digarap tim lain.",
    href: "/timeline",
    hrefLabel: "Buka timeline",
  },
  {
    icon: MessageSquare,
    title: "Kalau ada masalah",
    body:
      "Kesulitan dengan tugas / konflik kecil di tim / merasa overload → laporkan lewat menu di bagian bawah sidebar (Isu Tim). Aman dan bisa anonim.",
    href: "/konflik/baru",
    hrefLabel: "Laporkan masalah",
  },
];

// Role-specific tips — ditampilkan di atas UMUM_STEPS
const ROLE_STEPS: Partial<Record<Role, TutorialStep[]>> = {
  SUPER_ADMIN: [
    {
      icon: Users2,
      title: "Kelola pengguna",
      body:
        "Sebagai Super Admin, kamu bisa buat/edit/nonaktifkan akun anggota di /admin/pengguna. Reset password anggota juga dari sini.",
      href: "/admin/pengguna",
      hrefLabel: "Kelola pengguna",
    },
  ],
  KETUA: [
    {
      icon: Users2,
      title: "Perhatian Ketua",
      body:
        "Panel dashboard menampilkan warning kalau ada konflik yang belum diselesaikan. Cek berkala.",
      href: "/konflik",
      hrefLabel: "Pusat konflik",
    },
    {
      icon: Wallet,
      title: "Approve keuangan & RAB",
      body:
        "Bendahara input transaksi → kamu approve. Sama untuk RAB per divisi. Semua approval log-nya masuk audit trail.",
      href: "/keuangan",
      hrefLabel: "Buka keuangan",
    },
    {
      icon: ShieldAlert,
      title: "Pusat konflik",
      body:
        "Anggota bisa laporkan masalah dan kamu (dengan admin) yang decide. Ada status: OPEN → DISKUSI → SELESAI. Isi catatan resolusi biar pelapor tahu tindak lanjutnya.",
      href: "/konflik",
      hrefLabel: "Buka konflik",
    },
  ],
  SEKRETARIS: [
    {
      icon: FileText,
      title: "Bikin dokumen resmi",
      body:
        "Surat undangan, notulen rapat, daftar hadir, dan LPJ bisa di-generate dari template di /dokumen. Isi form → download PDF/DOCX.",
      href: "/dokumen",
      hrefLabel: "Buka dokumen",
    },
    {
      icon: CalendarDays,
      title: "Kelola rapat",
      body:
        "Buat jadwal rapat, kelola absensi, tulis notulen. Semua data ini bisa langsung di-generate jadi dokumen notulen resmi.",
      href: "/rapat",
      hrefLabel: "Buka rapat",
    },
  ],
  BENDAHARA: [
    {
      icon: Wallet,
      title: "Catat transaksi",
      body:
        "Input pemasukan/pengeluaran + upload struk (foto). Ketua yang approve. Saldo real-time muncul di dashboard.",
      href: "/keuangan",
      hrefLabel: "Buka keuangan",
    },
    {
      icon: FileText,
      title: "Susun RAB per kegiatan",
      body:
        "Kategori → item → nominal. Setelah lengkap, ajukan ke Ketua untuk di-approve.",
      href: "/rab",
      hrefLabel: "Buka RAB",
    },
  ],
  PJ_PDD: [
    {
      icon: Sparkles,
      title: "Kelola tim PDD",
      body:
        "Buat tugas untuk anggota PDD (upload foto kegiatan, edit dokumentasi, dsb). Media kamera → langsung ke modul Media.",
      href: "/media",
      hrefLabel: "Buka media",
    },
  ],
  PJ_ACARA: [
    {
      icon: Sparkles,
      title: "Kelola tim Acara",
      body:
        "Rencanakan program di modul Program (tema, target, PIC, tanggal). Progress-nya kamu update sendiri. Muncul otomatis di Timeline.",
      href: "/program",
      hrefLabel: "Buka program",
    },
  ],
  PJ_HUMLOG: [
    {
      icon: Sparkles,
      title: "Kelola tim HumLog",
      body:
        "Modul Pemangku Kepentingan untuk track komunikasi dengan pihak eksternal (RT/RW, tokoh masyarakat, mitra). Setiap kontak dicatat sebagai history.",
      href: "/pemangku",
      hrefLabel: "Buka pemangku",
    },
  ],
};

export default async function TutorialPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const role = session.user.role;
  const roleLabel = ROLE_LABELS[role];

  const roleSteps = ROLE_STEPS[role] ?? [];

  return (
    <div>
      <PageHeader
        title="Tutorial Aplikasi"
        description="Panduan cepat cara pakai Coordex — disesuaikan dengan role kamu."
      />

      <div className="mb-6 flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-medium">Selamat datang di Coordex!</p>
          <p className="mt-1 text-muted-foreground">
            Kamu login sebagai <Badge variant="outline">{roleLabel}</Badge> —
            berikut fitur yang paling sering dipakai role kamu. Tips tambahan
            untuk semua orang ada di bawah.
          </p>
        </div>
      </div>

      {roleSteps.length > 0 && (
        <section aria-labelledby="role-tips" className="mb-8">
          <h2
            id="role-tips"
            className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground"
          >
            <Sparkles className="h-4 w-4" /> Untuk role {roleLabel}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {roleSteps.map((s, i) => (
              <StepCard key={`role-${i}`} step={s} accent="primary" />
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="general-tips">
        <h2
          id="general-tips"
          className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground"
        >
          <BookOpen className="h-4 w-4" /> Panduan umum untuk semua anggota
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {UMUM_STEPS.map((s, i) => (
            <StepCard key={`umum-${i}`} step={s} accent="neutral" />
          ))}
        </div>
      </section>

      <div className="mt-10 rounded-lg border bg-muted/30 p-4 text-xs text-muted-foreground">
        Butuh bantuan lebih? Konten tutorial ini masih placeholder — akan
        di-update dengan panduan lengkap + screenshot per fitur. Kalau ada
        pertanyaan, tanyakan ke Ketua atau Sekretaris.
      </div>
    </div>
  );
}

function StepCard({
  step,
  accent,
}: {
  step: TutorialStep;
  accent: "primary" | "neutral";
}) {
  const Icon = step.icon;
  return (
    <Card
      className={cn(
        "transition-colors",
        accent === "primary" && "border-primary/30 bg-primary/5",
      )}
    >
      <CardHeader className="pb-2">
        <div className="mb-1 flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <CardTitle className="text-sm leading-snug">{step.title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-xs leading-relaxed text-muted-foreground">
          {step.body}
        </p>
        {step.href && (
          <Link
            href={step.href}
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            {step.hrefLabel ?? "Buka"} →
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
