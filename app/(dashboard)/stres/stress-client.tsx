"use client";

import { CheckCircle2, Frown, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import { ROLE_LABELS } from "@/components/layout/role-label";
import { BAND_COLOR, StressBandBadge } from "@/components/stress/stress-band";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { STRESS_QUESTIONS, getStressBand } from "@/lib/services/stress.service";
import type { Role } from "@/lib/generated/prisma/client";
import { cn } from "@/lib/utils";
import type { StressBand } from "@/types";

type ActiveSurvey = {
  id: string;
  weekNumber: number;
  hasResponded: boolean;
  opensAt: string;
  closesAt: string;
};

type MyHistoryItem = { weekNumber: number; index: number; band: StressBand };

type KetuaDashboard = {
  currentWeek: null | {
    surveyId: string;
    weekNumber: number;
    avgStressIndex: number;
    responseCount: number;
    expectedCount: number;
    responseRate: number;
    perMember: { userId: string; name: string; role: string; index: number; band: string }[];
  };
  trend: { weekNumber: number; avgStressIndex: number; responseCount: number }[];
};

type Props = {
  isKetua: boolean;
  activeSurvey: ActiveSurvey | null;
  myHistory: MyHistoryItem[];
  ketuaDashboard: KetuaDashboard | null;
};

type Tab = "isi" | "riwayat" | "dashboard";

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function StressPageClient({
  isKetua,
  activeSurvey,
  myHistory,
  ketuaDashboard,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(
    activeSurvey && !activeSurvey.hasResponded ? "isi" : isKetua ? "dashboard" : "riwayat"
  );

  const tabs: { value: Tab; label: string; show: boolean }[] = [
    { value: "isi", label: "Isi Survei", show: true },
    { value: "riwayat", label: "Riwayat", show: true },
    { value: "dashboard", label: "Dashboard Tim", show: isKetua },
  ];

  return (
    <div className="space-y-4">
      {/* Segmented tab bar — 44px thumb-friendly rows on mobile, animated
          active pill with primary bg. */}
      <div
        role="tablist"
        aria-label="Bagian survei"
        className="inline-flex w-full max-w-md rounded-lg border bg-muted/40 p-1 sm:w-auto"
      >
        {tabs
          .filter((t) => t.show)
          .map((t) => {
            const active = tab === t.value;
            return (
              <button
                key={t.value}
                role="tab"
                aria-selected={active}
                type="button"
                onClick={() => setTab(t.value)}
                className={cn(
                  "flex-1 rounded-md px-3 py-2 text-xs font-medium transition-all sm:text-sm",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </button>
            );
          })}
      </div>

      {tab === "isi" && (
        <SurveyTab
          isKetua={isKetua}
          activeSurvey={activeSurvey}
          onSubmitted={() => router.refresh()}
        />
      )}
      {tab === "riwayat" && <HistoryTab history={myHistory} />}
      {tab === "dashboard" && isKetua && <KetuaDashboardTab data={ketuaDashboard} />}
    </div>
  );
}

function SurveyTab({
  isKetua,
  activeSurvey,
  onSubmitted,
}: {
  isKetua: boolean;
  activeSurvey: ActiveSurvey | null;
  onSubmitted: () => void;
}) {
  const [creating, setCreating] = useState(false);
  const [weekNumber, setWeekNumber] = useState<number>(1);
  const now = new Date();
  const in7 = new Date(now.getTime() + 7 * 86400_000);
  const [opensAt, setOpensAt] = useState<string>(toLocalInput(now));
  const [closesAt, setClosesAt] = useState<string>(toLocalInput(in7));
  const [scores, setScores] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!activeSurvey) {
    if (!isKetua) {
      return (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-muted">
              <Frown className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-base font-medium">Tidak ada survei aktif</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Ketua akan membuka survei mingguan sesuai jadwal. Kunjungi tab
              Riwayat untuk melihat skor Anda sebelumnya.
            </p>
          </CardContent>
        </Card>
      );
    }
    async function createSurvey() {
      if (new Date(closesAt) <= new Date(opensAt)) {
        toast.error("Tanggal tutup harus setelah tanggal buka");
        return;
      }
      setCreating(true);
      const res = await fetch("/api/stress/surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekNumber,
          surveyDate: new Date(opensAt).toISOString(),
          opensAt: new Date(opensAt).toISOString(),
          closesAt: new Date(closesAt).toISOString(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      setCreating(false);
      if (!res.ok) {
        toast.error(json.error?.message ?? "Gagal membuat survei");
        return;
      }
      toast.success(`Survei minggu ke-${weekNumber} dibuka`);
      onSubmitted();
    }
    return (
      <Card>
        <CardHeader>
          <CardTitle>Buka Survei Mingguan</CardTitle>
          <p className="text-xs text-muted-foreground">
            Anggota hanya dapat mengisi survei antara jadwal buka & tutup di bawah.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="weekNumber">Minggu ke-</Label>
              <input
                id="weekNumber"
                type="number"
                min={1}
                max={20}
                value={weekNumber}
                onChange={(e) => setWeekNumber(Number(e.target.value))}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="opensAt">Buka mulai</Label>
              <input
                id="opensAt"
                type="datetime-local"
                value={opensAt}
                onChange={(e) => setOpensAt(e.target.value)}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="closesAt">Ditutup pada</Label>
              <input
                id="closesAt"
                type="datetime-local"
                value={closesAt}
                onChange={(e) => setClosesAt(e.target.value)}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              />
            </div>
          </div>
          <Button onClick={createSurvey} disabled={creating}>
            {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Buat Survei
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (activeSurvey.hasResponded) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-emerald-50">
            <CheckCircle2 className="h-7 w-7 text-emerald-600" />
          </div>
          <p className="text-base font-semibold">
            Survei minggu ke-{activeSurvey.weekNumber} sudah dikirim ✓
          </p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Terima kasih sudah meluangkan waktu. Buka tab{" "}
            <span className="font-medium text-foreground">Riwayat</span> untuk
            melihat perkembangan skor Anda.
          </p>
        </CardContent>
      </Card>
    );
  }

  async function onSubmit() {
    for (const q of STRESS_QUESTIONS) {
      if (!scores[q.key]) {
        toast.error(`Jawab pertanyaan: ${q.label}`);
        return;
      }
    }
    setSubmitting(true);
    const res = await fetch(`/api/stress/surveys/${activeSurvey?.id}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fatigueScore: scores.fatigueScore,
        motivationScore: scores.motivationScore,
        sleepScore: scores.sleepScore,
        conflictPerception: scores.conflictPerception,
        stressLevel: scores.stressLevel,
        notes: notes || undefined,
      }),
    });
    const json = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      toast.error(json.error?.message ?? "Gagal mengirim jawaban");
      return;
    }
    toast.success("Survei terkirim. Terima kasih!");
    onSubmitted();
  }

  const answered = STRESS_QUESTIONS.filter((q) => scores[q.key]).length;
  const total = STRESS_QUESTIONS.length;
  const progress = Math.round((answered / total) * 100);

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <CardTitle>Survei Minggu ke-{activeSurvey.weekNumber}</CardTitle>
          <span className="text-xs tabular-nums text-muted-foreground">
            {answered} / {total} pertanyaan
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Periode isi: {new Date(activeSurvey.opensAt).toLocaleString("id-ID")} —{" "}
          {new Date(activeSurvey.closesAt).toLocaleString("id-ID")}
        </p>
        {/* Progress bar */}
        <div
          className="h-1.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Kemajuan pengisian"
        >
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {STRESS_QUESTIONS.map((q, i) => (
          <div key={q.key} className="space-y-2.5">
            <div>
              <p className="flex items-baseline gap-2 font-medium">
                <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {q.label}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">{q.description}</p>
            </div>
            <div
              role="radiogroup"
              aria-label={q.label}
              className="grid grid-cols-5 gap-1.5 sm:gap-2"
            >
              {[1, 2, 3, 4, 5].map((v) => {
                const selected = scores[q.key] === v;
                return (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setScores((s) => ({ ...s, [q.key]: v }))}
                    className={cn(
                      "flex flex-col items-center gap-0.5 rounded-lg border p-2 text-xs transition-all",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      selected
                        ? "border-primary bg-primary/10 text-primary ring-1 ring-inset ring-primary/30"
                        : "border-input hover:border-primary/40 hover:bg-muted",
                    )}
                  >
                    <span className="text-base font-semibold sm:text-lg">{v}</span>
                    <span
                      className={cn(
                        "text-center text-[10px] leading-tight sm:text-xs",
                        selected ? "text-primary/80" : "text-muted-foreground",
                      )}
                    >
                      {q.labels[v - 1]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <Separator />

        <div className="space-y-2">
          <Label htmlFor="notes">Catatan tambahan (opsional)</Label>
          <textarea
            id="notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Hanya Ketua yang dapat melihat catatan ini."
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs"
          />
        </div>

        <Button onClick={onSubmit} disabled={submitting} className="w-full">
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Kirim Jawaban
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Jawaban tidak dapat diubah setelah dikirim.
        </p>
      </CardContent>
    </Card>
  );
}

function HistoryTab({ history }: { history: MyHistoryItem[] }) {
  if (history.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Belum ada riwayat. Isi survei mingguan untuk mulai membangun riwayat.
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Riwayat Skor Stres Anda</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history.map((h) => ({ minggu: `M${h.weekNumber}`, skor: h.index }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="minggu" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Line type="monotone" dataKey="skor" stroke="#10b981" strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 grid gap-2 text-sm">
          {history.slice(-4).reverse().map((h) => (
            <div
              key={h.weekNumber}
              className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2"
            >
              <span className="font-medium">Minggu ke-{h.weekNumber}</span>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{h.index}</span>
                <StressBandBadge band={h.band} />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function KetuaDashboardTab({ data }: { data: KetuaDashboard | null }) {
  if (!data || !data.currentWeek) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Belum ada survei. Buat survei minggu ini di tab Isi Survei.
        </CardContent>
      </Card>
    );
  }
  const cw = data.currentWeek;
  const band = getStressBand(cw.avgStressIndex);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Indeks Stres Tim
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold" style={{ color: BAND_COLOR[band] }}>
              {cw.avgStressIndex}
            </p>
            <div className="mt-1">
              <StressBandBadge band={band} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Response Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{cw.responseRate}%</p>
            <p className="text-xs text-muted-foreground">
              {cw.responseCount} dari {cw.expectedCount} anggota
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Minggu ke-
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{cw.weekNumber}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tren 4 Minggu</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.trend.map((t) => ({ minggu: `M${t.weekNumber}`, indeks: t.avgStressIndex }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="minggu" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="indeks" stroke="#10b981" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Per Anggota (Minggu ke-{cw.weekNumber})</CardTitle>
        </CardHeader>
        <CardContent>
          {cw.perMember.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada response.</p>
          ) : (
            <div className="space-y-2">
              {cw.perMember.map((m) => (
                <div
                  key={m.userId}
                  className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2"
                >
                  <div>
                    <p className="font-medium">{m.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {ROLE_LABELS[m.role as Role] ?? m.role}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{m.index}</span>
                    <StressBandBadge band={m.band as StressBand} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
