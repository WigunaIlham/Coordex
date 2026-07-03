"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Calendar,
  Check,
  ClipboardList,
  Loader2,
  MapPin,
  Plus,
  Users2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { ROLE_LABELS } from "@/components/layout/role-label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Role } from "@/lib/generated/prisma/client";
import { cn, getInitials } from "@/lib/utils";

const schema = z.object({
  title: z.string().min(1, "Judul wajib").max(200),
  scheduledAt: z.string().min(1, "Waktu wajib"),
  location: z.string().max(200).optional(),
  agenda: z.string().max(5000).optional(),
  attendeeIds: z.array(z.string()).min(1, "Pilih minimal 1 peserta"),
});
type FormInput = z.infer<typeof schema>;

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type Member = { id: string; name: string; role: Role };

export function NewMeetingDialog({
  members,
  triggerLabel = "Rapat Baru",
}: {
  members: Member[];
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" /> {triggerLabel}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] w-[95vw] overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="border-b px-6 pb-4 pt-6">
          <DialogTitle>Rapat Baru</DialogTitle>
          <DialogDescription>
            Tentukan judul, waktu, lokasi, dan peserta rapat.
          </DialogDescription>
        </DialogHeader>
          {open && (
            <NewMeetingForm
              members={members}
              onCancel={() => setOpen(false)}
              onCreated={() => setOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function NewMeetingForm({
  members,
  onCancel,
  onCreated,
}: {
  members: Member[];
  onCancel: () => void;
  onCreated: () => void;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(members.map((m) => m.id));
  const [memberSearch, setMemberSearch] = useState("");

  const defaultTime = useMemo(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    return toLocalInput(d);
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      scheduledAt: defaultTime,
      location: "",
      agenda: "",
      attendeeIds: members.map((m) => m.id),
    },
  });

  useEffect(() => {
    setValue("attendeeIds", selected, { shouldValidate: false });
  }, [selected, setValue]);

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        ROLE_LABELS[m.role].toLowerCase().includes(q),
    );
  }, [members, memberSearch]);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  }
  function selectAll() {
    const ids = filteredMembers.map((m) => m.id);
    setSelected(Array.from(new Set([...selected, ...ids])));
  }
  function clearAll() {
    setSelected([]);
  }

  async function onSubmit(values: FormInput) {
    const res = await fetch("/api/meetings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...values,
        scheduledAt: new Date(values.scheduledAt).toISOString(),
        location: values.location || undefined,
        agenda: values.agenda || undefined,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.error?.message ?? "Gagal membuat rapat");
      return;
    }
    toast.success("Rapat dibuat");
    onCreated();
    router.push(`/rapat/${json.data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="max-h-[calc(92vh-11rem)] space-y-6 overflow-y-auto px-6 py-5">
        <fieldset className="space-y-4">
          <SectionLegend icon={ClipboardList} label="Detail Rapat" />
          <div className="space-y-1.5">
            <Label htmlFor="title">
              Judul <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              autoFocus
              placeholder="Rapat Persiapan Pembukaan"
              disabled={isSubmitting}
              aria-invalid={!!errors.title}
              className="h-10"
              {...register("title")}
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label
                htmlFor="scheduledAt"
                className="flex items-center gap-1.5"
              >
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                Waktu <span className="text-destructive">*</span>
              </Label>
              <Input
                id="scheduledAt"
                type="datetime-local"
                disabled={isSubmitting}
                aria-invalid={!!errors.scheduledAt}
                className="h-10"
                {...register("scheduledAt")}
              />
              {errors.scheduledAt && (
                <p className="text-xs text-destructive">
                  {errors.scheduledAt.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="location" className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                Lokasi (opsional)
              </Label>
              <Input
                id="location"
                placeholder="Posko KKN / Zoom / …"
                disabled={isSubmitting}
                className="h-10"
                {...register("location")}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="agenda">Agenda (opsional)</Label>
            <textarea
              id="agenda"
              rows={4}
              disabled={isSubmitting}
              placeholder="Poin-poin yang akan dibahas…"
              className="w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("agenda")}
            />
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <SectionLegend icon={Users2} label="Peserta yang Diundang" />
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              placeholder="Cari anggota…"
              className="h-9 max-w-xs flex-1"
              aria-label="Cari anggota"
            />
            <div className="ml-auto flex items-center gap-1 text-xs">
              <span className="text-muted-foreground">
                {selected.length} / {members.length} dipilih
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={selectAll}
              >
                Pilih semua
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={clearAll}
              >
                Kosongkan
              </Button>
            </div>
          </div>
          <div
            className="grid max-h-72 gap-1 overflow-y-auto rounded-lg border p-2 sm:grid-cols-2"
            role="group"
            aria-label="Daftar peserta"
          >
            {filteredMembers.length === 0 ? (
              <p className="col-span-full py-6 text-center text-xs text-muted-foreground">
                Tidak ada anggota cocok.
              </p>
            ) : (
              filteredMembers.map((m) => {
                const checked = selected.includes(m.id);
                return (
                  <label
                    key={m.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 rounded-md border p-2 text-sm transition-colors",
                      checked
                        ? "border-primary/40 bg-primary/5"
                        : "border-transparent hover:bg-muted",
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggle(m.id)}
                      aria-label={`Undang ${m.name}`}
                    />
                    <Avatar className="h-7 w-7 border">
                      <AvatarFallback className="text-[10px]">
                        {getInitials(m.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium leading-tight">
                        {m.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {ROLE_LABELS[m.role]}
                      </p>
                    </div>
                    {checked && (
                      <Check className="h-4 w-4 text-primary" aria-hidden />
                    )}
                  </label>
                );
              })
            )}
          </div>
          {errors.attendeeIds && (
            <p className="text-xs text-destructive">
              {errors.attendeeIds.message}
            </p>
          )}
        </fieldset>
      </div>

      <DialogFooter className="border-t bg-muted/20 px-6 py-4">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Batal
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Buat Rapat
        </Button>
      </DialogFooter>
    </form>
  );
}

function SectionLegend({
  icon: Icon,
  label,
}: {
  icon: typeof ClipboardList;
  label: string;
}) {
  return (
    <legend className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </legend>
  );
}
