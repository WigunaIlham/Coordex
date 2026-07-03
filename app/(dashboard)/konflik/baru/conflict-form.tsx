"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Loader2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { ConflictCategory } from "@/lib/generated/prisma/client";
import { cn } from "@/lib/utils";
import { CONFLICT_CATEGORY_LABELS } from "@/lib/validators/conflict";

const schema = z.object({
  category: z.enum(["BEBAN_KERJA", "KOMUNIKASI", "INTERPERSONAL", "LAINNYA"]),
  description: z.string().min(10, "Deskripsi minimal 10 karakter").max(5000),
  isAnonymous: z.boolean(),
});

type Input = z.infer<typeof schema>;

const MAX = 5000;

export function ConflictForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<Input>({
    resolver: zodResolver(schema),
    defaultValues: {
      category: "KOMUNIKASI",
      description: "",
      isAnonymous: true,
    },
  });
  const watchedCategory = watch("category");
  const watchedAnonymous = watch("isAnonymous");
  const watchedDescription = watch("description") ?? "";
  const charCount = watchedDescription.length;

  async function onSubmit(values: Input) {
    setSubmitting(true);
    const res = await fetch("/api/conflicts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const json = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      toast.error(json.error?.message ?? "Gagal mengirim laporan");
      return;
    }
    toast.success("Laporan terkirim. Terima kasih sudah bersuara.");
    router.push("/konflik");
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="space-y-5 p-5 sm:p-6">
        {/* Privacy note — subtle info box (not alarming). */}
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <p className="text-amber-900/90">
            Identitas Anda disembunyikan dari Ketua bila anonim diaktifkan. Namun
            isi deskripsi tetap bisa mengungkap Anda — pertimbangkan saat menulis.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          {/* Kategori: pilihan visual bertombol, lebih cepat dari dropdown */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Kategori laporan <span className="text-destructive">*</span>
            </Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {Object.entries(CONFLICT_CATEGORY_LABELS).map(([value, label]) => {
                const active = watchedCategory === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setValue("category", value as ConflictCategory)}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-input bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
                    )}
                    aria-pressed={active}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            {/* Hidden select for a11y fallback + SR announcement */}
            <Select
              value={watchedCategory}
              onValueChange={(v) => v && setValue("category", v as ConflictCategory)}
            >
              <SelectTrigger className="sr-only" tabIndex={-1} aria-hidden>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CONFLICT_CATEGORY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-3">
              <Label htmlFor="description" className="text-sm font-medium">
                Deskripsi <span className="text-destructive">*</span>
              </Label>
              <span
                className={cn(
                  "text-[11px] tabular-nums",
                  charCount > MAX * 0.9 ? "text-amber-600" : "text-muted-foreground",
                )}
                aria-live="polite"
              >
                {charCount.toLocaleString("id-ID")} / {MAX.toLocaleString("id-ID")}
              </span>
            </div>
            <textarea
              id="description"
              rows={7}
              maxLength={MAX}
              disabled={submitting}
              placeholder="Ceritakan situasinya. Kalau bisa sertakan konteks: kapan, dimana, siapa yang terlibat, dampak yang Anda rasakan."
              aria-invalid={!!errors.description}
              className="w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-destructive"
              {...register("description")}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
            <p className="text-[11px] text-muted-foreground">
              Minimal 10 karakter. Semakin spesifik, semakin cepat bisa ditangani.
            </p>
          </div>

          <label
            htmlFor="anonymous"
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
              watchedAnonymous
                ? "border-primary/40 bg-primary/5"
                : "border-input hover:border-primary/30",
            )}
          >
            <div
              className={cn(
                "grid h-8 w-8 shrink-0 place-items-center rounded-full",
                watchedAnonymous
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground",
              )}
            >
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-sm font-medium">Kirim secara anonim</span>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Nama Anda tidak muncul di tampilan Ketua/Admin.
              </p>
            </div>
            <Switch
              id="anonymous"
              checked={watchedAnonymous}
              onCheckedChange={(v) => setValue("isAnonymous", v)}
              aria-describedby="anon-desc"
            />
          </label>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push("/konflik")}
              disabled={submitting}
              className="sm:w-auto"
            >
              Batal
            </Button>
            <Button type="submit" disabled={submitting} className="sm:w-auto">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Kirim Laporan
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
