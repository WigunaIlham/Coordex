"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Download,
  FileDown,
  FileText,
  Image as ImageIcon,
  Loader2,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TransactionType } from "@/lib/generated/prisma/client";
import { cn, formatCurrency, formatDate, getInitials } from "@/lib/utils";
import { FINANCE_CATEGORIES } from "@/lib/validators/finance";

type Tx = {
  id: string;
  type: TransactionType;
  category: string;
  amount: number;
  description: string;
  date: string;
  receiptUrl: string | null;
  receiptSignedUrl?: string | null;
  recordedBy: { id: string; name: string; role: string };
};

const schema = z.object({
  type: z.enum(["PEMASUKAN", "PENGELUARAN"]),
  category: z.string().min(1, "Kategori wajib"),
  amount: z.number().positive("Nominal harus > 0"),
  description: z.string().min(1, "Deskripsi wajib").max(2000),
  date: z.string().min(1, "Tanggal wajib"),
});
type FormInput = z.infer<typeof schema>;

function isPdfUrl(u: string | null): boolean {
  if (!u) return false;
  const lower = u.toLowerCase();
  return lower.endsWith(".pdf") || lower.includes(".pdf?");
}

export function FinanceClient({
  initialTransactions,
  summary,
  canWrite,
}: {
  initialTransactions: Tx[];
  summary: { pemasukan: number; pengeluaran: number; saldo: number };
  canWrite: boolean;
}) {
  const router = useRouter();
  const [transactions, setTransactions] = useState(initialTransactions);

  // Lazy-load signed receipt URLs after mount, in a single batch request.
  useEffect(() => {
    const ids = initialTransactions.filter((t) => t.receiptUrl).map((t) => t.id);
    if (ids.length === 0) return;
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/finance/receipts/urls", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        });
        if (!res.ok || !alive) return;
        const json = (await res.json()) as { data: Record<string, string | null> };
        const urls = json.data ?? {};
        setTransactions((prev) =>
          prev.map((t) => (urls[t.id] ? { ...t, receiptSignedUrl: urls[t.id] } : t)),
        );
      } catch {
        // Silent: table falls back to the file-type icon.
      }
    })();
    return () => {
      alive = false;
    };
  }, [initialTransactions]);

  const [filterType, setFilterType] = useState<TransactionType | "ALL">("ALL");
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [openCreate, setOpenCreate] = useState(false);
  const [openReceipt, setOpenReceipt] = useState<string | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: "PENGELUARAN",
      category: "Konsumsi",
      amount: 0,
      description: "",
      date: new Date().toISOString().slice(0, 10),
    },
  });
  const watchedType = watch("type");
  const watchedCategory = watch("category");
  const watchedAmount = watch("amount");

  const visibleTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (filterType !== "ALL" && t.type !== filterType) return false;
      if (filterCategory !== "ALL" && t.category !== filterCategory) return false;
      return true;
    });
  }, [transactions, filterType, filterCategory]);

  const categoryOptions = useMemo(() => {
    const set = new Set<string>(FINANCE_CATEGORIES);
    transactions.forEach((t) => set.add(t.category));
    return Array.from(set).sort();
  }, [transactions]);

  async function onSubmit(values: FormInput) {
    const fileInput = document.getElementById("receipt-file") as HTMLInputElement | null;
    const file = fileInput?.files?.[0] ?? null;

    const res = await fetch("/api/finance/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...values,
        amount: Number(values.amount),
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error?.message ?? "Gagal menyimpan transaksi");
      return;
    }
    const created = json.data as Tx;

    if (file) {
      const fd = new FormData();
      fd.append("file", file);
      const upRes = await fetch(`/api/finance/transactions/${created.id}/receipt`, {
        method: "POST",
        body: fd,
      });
      if (!upRes.ok) {
        const ej = await upRes.json().catch(() => ({}));
        toast.error(`Transaksi tersimpan, tapi struk gagal: ${ej.error?.message ?? upRes.status}`);
      } else {
        const upJson = await upRes.json();
        created.receiptUrl = upJson.data.receiptUrl;
        toast.success("Struk terupload");
      }
    }

    setTransactions((prev) => [created, ...prev]);
    toast.success("Transaksi tersimpan");
    reset();
    setOpenCreate(false);
    router.refresh();
  }

  async function onDelete(id: string) {
    if (!confirm("Hapus transaksi ini? Tindakan tidak dapat dibatalkan.")) return;
    const res = await fetch(`/api/finance/transactions/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Gagal menghapus");
      return;
    }
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    toast.success("Transaksi dihapus");
    router.refresh();
  }

  async function viewReceipt(id: string) {
    setOpenReceipt(id);
    setReceiptUrl(null);
    setReceiptLoading(true);
    const res = await fetch(`/api/finance/transactions/${id}/receipt`);
    setReceiptLoading(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error(j.error?.message ?? "Struk tidak dapat ditampilkan");
      setOpenReceipt(null);
      return;
    }
    const json = await res.json();
    setReceiptUrl(json.data.signedUrl);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Pemasukan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-emerald-600">
              {formatCurrency(summary.pemasukan)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Pengeluaran
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-red-600">
              {formatCurrency(summary.pengeluaran)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Saldo Saat Ini
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={cn(
                "text-2xl font-semibold",
                summary.saldo < 0 ? "text-red-600" : "text-foreground"
              )}
            >
              {formatCurrency(summary.saldo)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filterType}
          onValueChange={(v) => v && setFilterType(v as TransactionType | "ALL")}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Tipe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua tipe</SelectItem>
            <SelectItem value="PEMASUKAN">Pemasukan</SelectItem>
            <SelectItem value="PENGELUARAN">Pengeluaran</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filterCategory}
          onValueChange={(v) => v && setFilterCategory(v)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua kategori</SelectItem>
            {categoryOptions.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto flex flex-wrap gap-2">
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/api/finance/export/pdf"
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <FileDown className="mr-2 h-4 w-4" /> PDF
          </a>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/api/finance/export/xlsx"
            download
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <Download className="mr-2 h-4 w-4" /> Excel
          </a>
          {canWrite && (
            <Button onClick={() => setOpenCreate(true)}>
              <Plus className="mr-2 h-4 w-4" /> Catat Transaksi
            </Button>
          )}
        </div>
      </div>

      {/* Mobile: transaksi ditampilkan sebagai daftar card yang mudah di-scan. */}
      <div className="space-y-2 md:hidden">
        {visibleTransactions.length === 0 && (
          <div className="rounded-xl border border-dashed bg-muted/20 px-6 py-10 text-center text-sm text-muted-foreground">
            Belum ada transaksi.
          </div>
        )}
        {visibleTransactions.map((t) => (
          <div
            key={t.id}
            className="rounded-xl border bg-card p-3 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {t.category}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(t.date, { dateStyle: "medium" })}
                  </span>
                </div>
                <p className="mt-1.5 line-clamp-2 text-sm font-medium">
                  {t.description}
                </p>
                <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Avatar className="h-4 w-4">
                    <AvatarFallback className="text-[8px]">
                      {getInitials(t.recordedBy.name)}
                    </AvatarFallback>
                  </Avatar>
                  {t.recordedBy.name}
                </div>
              </div>
              <p
                className={cn(
                  "shrink-0 text-right text-sm font-semibold tabular-nums",
                  t.type === "PEMASUKAN" ? "text-emerald-600" : "text-red-600",
                )}
              >
                {t.type === "PEMASUKAN" ? "+" : "-"}
                {formatCurrency(t.amount)}
              </p>
            </div>
            {(t.receiptUrl || canWrite) && (
              <div className="mt-2 flex items-center justify-between border-t pt-2">
                {t.receiptUrl ? (
                  <button
                    type="button"
                    onClick={() => viewReceipt(t.id)}
                    className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                  >
                    {t.receiptSignedUrl && !isPdfUrl(t.receiptUrl) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={t.receiptSignedUrl}
                        alt=""
                        className="h-6 w-6 rounded object-cover"
                      />
                    ) : isPdfUrl(t.receiptUrl) ? (
                      <FileText className="h-4 w-4" />
                    ) : (
                      <ImageIcon className="h-4 w-4" />
                    )}
                    Lihat struk
                  </button>
                ) : (
                  <span className="text-[11px] text-muted-foreground">Tanpa struk</span>
                )}
                {canWrite && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(t.id)}
                    className="h-7 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" /> Hapus
                  </Button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop: tabel klasik dengan sticky header. */}
      <div className="hidden overflow-hidden rounded-xl border bg-background md:block">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-muted/60 backdrop-blur">
            <TableRow>
              <TableHead>Tanggal</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Deskripsi</TableHead>
              <TableHead>Pencatat</TableHead>
              <TableHead className="text-right">Nominal</TableHead>
              <TableHead className="text-center">Struk</TableHead>
              {canWrite && <TableHead className="w-12" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleTransactions.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={canWrite ? 7 : 6}
                  className="text-center text-sm text-muted-foreground"
                >
                  Belum ada transaksi.
                </TableCell>
              </TableRow>
            )}
            {visibleTransactions.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="text-sm">{formatDate(t.date)}</TableCell>
                <TableCell>
                  <Badge variant="outline">{t.category}</Badge>
                </TableCell>
                <TableCell className="max-w-xs truncate text-sm">
                  {t.description}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-xs">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[10px]">
                        {getInitials(t.recordedBy.name)}
                      </AvatarFallback>
                    </Avatar>
                    {t.recordedBy.name}
                  </div>
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right text-sm font-medium",
                    t.type === "PEMASUKAN" ? "text-emerald-600" : "text-red-600"
                  )}
                >
                  {t.type === "PEMASUKAN" ? "+" : "-"}
                  {formatCurrency(t.amount)}
                </TableCell>
                <TableCell className="text-center">
                  {t.receiptUrl ? (
                    <button
                      type="button"
                      onClick={() => viewReceipt(t.id)}
                      className="mx-auto flex items-center gap-1.5 rounded-md border bg-background p-0.5 hover:border-primary/60"
                      aria-label="Lihat struk"
                    >
                      {t.receiptSignedUrl && !isPdfUrl(t.receiptUrl) ? (
                        // Signed URL renders an inline thumbnail. Use <img>
                        // (not next/image) because signed URLs rotate hourly.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={t.receiptSignedUrl}
                          alt="Struk"
                          className="h-9 w-9 rounded object-cover"
                        />
                      ) : (
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded bg-muted">
                          {isPdfUrl(t.receiptUrl) ? (
                            <FileText className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          )}
                        </span>
                      )}
                    </button>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                {canWrite && (
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(t.id)}
                      title="Hapus"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Create dialog */}
      <Dialog open={openCreate} onOpenChange={(v) => (v ? setOpenCreate(true) : (setOpenCreate(false), reset()))}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Catat Transaksi</DialogTitle>
            <DialogDescription>
              Saldo akan terupdate otomatis. Struk opsional tapi disarankan.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            {/* Type toggle: 2 button visual, lebih cepat dari dropdown */}
            <div className="space-y-1.5">
              <Label>
                Tipe <span className="text-destructive">*</span>
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { v: "PEMASUKAN", label: "Pemasukan", accent: "emerald" },
                    { v: "PENGELUARAN", label: "Pengeluaran", accent: "rose" },
                  ] as const
                ).map((opt) => {
                  const active = watchedType === opt.v;
                  return (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() =>
                        setValue("type", opt.v as TransactionType, { shouldValidate: true })
                      }
                      className={cn(
                        "rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                        active && opt.accent === "emerald" &&
                          "border-emerald-300 bg-emerald-50 text-emerald-700",
                        active && opt.accent === "rose" &&
                          "border-rose-300 bg-rose-50 text-rose-700",
                        !active &&
                          "border-input bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
                      )}
                      aria-pressed={active}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Kategori</Label>
                <Select
                  value={watchedCategory}
                  onValueChange={(v) => v && setValue("category", v)}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FINANCE_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="date">
                  Tanggal <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="date"
                  type="date"
                  disabled={isSubmitting}
                  className="h-10"
                  {...register("date")}
                />
                {errors.date && (
                  <p className="text-xs text-destructive">{errors.date.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="amount">
                Nominal (Rp) <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                  Rp
                </span>
                <Input
                  id="amount"
                  type="number"
                  min={0}
                  step="1000"
                  inputMode="numeric"
                  disabled={isSubmitting}
                  aria-invalid={!!errors.amount}
                  className="h-10 pl-8 text-right tabular-nums"
                  {...register("amount", { valueAsNumber: true })}
                />
              </div>
              {errors.amount ? (
                <p className="text-xs text-destructive">{errors.amount.message}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Pratinjau:{" "}
                  <span className="font-medium tabular-nums text-foreground">
                    {formatCurrency(Number.isFinite(watchedAmount) ? watchedAmount : 0)}
                  </span>
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">
                Deskripsi <span className="text-destructive">*</span>
              </Label>
              <textarea
                id="description"
                rows={3}
                disabled={isSubmitting}
                placeholder="Contoh: Beli spanduk pembukaan (5 x 2 m)"
                aria-invalid={!!errors.description}
                className="w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-destructive"
                {...register("description")}
              />
              {errors.description && (
                <p className="text-xs text-destructive">{errors.description.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="receipt-file" className="flex items-center gap-2 text-sm">
                <Upload className="h-4 w-4" /> Struk (opsional)
              </Label>
              <Input
                id="receipt-file"
                type="file"
                accept=".jpg,.jpeg,.png,.pdf,image/*,application/pdf"
                className="h-10 file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-foreground"
              />
              <p className="text-[11px] text-muted-foreground">
                JPG / PNG / PDF, maksimal 5 MB. Bendahara sarankan lampirkan bukti.
              </p>
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                type="button"
                variant="ghost"
                disabled={isSubmitting}
                onClick={() => {
                  reset();
                  setOpenCreate(false);
                }}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simpan Transaksi
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Receipt viewer */}
      <Dialog
        open={!!openReceipt}
        onOpenChange={(v) => {
          if (!v) {
            setOpenReceipt(null);
            setReceiptUrl(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Struk Transaksi</DialogTitle>
          </DialogHeader>
          {receiptLoading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
          {receiptUrl && (
            <div className="overflow-auto">
              {receiptUrl.toLowerCase().includes(".pdf") ? (
                <iframe src={receiptUrl} title="Struk" className="h-[60vh] w-full" />
              ) : (
                <picture>
                  <img src={receiptUrl} alt="Struk" className="mx-auto max-h-[60vh]" />
                </picture>
              )}
              <p className="mt-2 text-center text-xs text-muted-foreground">
                <a href={receiptUrl} target="_blank" rel="noreferrer" className="underline">
                  Buka di tab baru
                </a>
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
