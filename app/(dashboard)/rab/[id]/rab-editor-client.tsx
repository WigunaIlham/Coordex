"use client";

import { Download, FileDown, Loader2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  categoryTotal,
  formatQuantity,
  formatRupiah,
  grandTotal,
  itemSubtotal,
} from "@/lib/services/rab.service";

type Item = {
  id: string;
  name: string;
  volume: string;
  unit: string;
  unitPrice: string;
  notes: string | null;
  order: number;
};

type Category = {
  id: string;
  name: string;
  order: number;
  items: Item[];
};

type Rab = {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
  createdBy: { id: string; name: string };
  categories: Category[];
};

async function safeJson(res: Response): Promise<{ data?: unknown; error?: { message?: string } }> {
  const t = await res.text();
  if (!t) return {};
  try {
    return JSON.parse(t);
  } catch {
    return { error: { message: `Server error (${res.status})` } };
  }
}

export function RabEditorClient({ rab, canEdit }: { rab: Rab; canEdit: boolean }) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>(rab.categories);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addingCat, setAddingCat] = useState(false);
  const [savingItem, setSavingItem] = useState<string | null>(null);

  const total = useMemo(() => grandTotal(categories), [categories]);

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    setAddingCat(true);
    const res = await fetch(`/api/rab/${rab.id}/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCategoryName }),
    });
    const json = await safeJson(res);
    setAddingCat(false);
    if (!res.ok) {
      toast.error(json.error?.message ?? "Gagal menambah kategori");
      return;
    }
    const created = json.data as Category;
    setCategories((prev) => [...prev, { ...created, items: [] }]);
    setNewCategoryName("");
    router.refresh();
  }

  async function renameCategory(catId: string, name: string) {
    setCategories((prev) => prev.map((c) => (c.id === catId ? { ...c, name } : c)));
  }

  async function commitRenameCategory(catId: string, name: string) {
    await fetch(`/api/rab/${rab.id}/categories/${catId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
  }

  async function deleteCategory(catId: string) {
    if (!window.confirm("Hapus kategori beserta seluruh itemnya?")) return;
    const res = await fetch(`/api/rab/${rab.id}/categories/${catId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      toast.error("Gagal menghapus kategori");
      return;
    }
    setCategories((prev) => prev.filter((c) => c.id !== catId));
    toast.success("Kategori dihapus");
    router.refresh();
  }

  async function addItem(catId: string) {
    setSavingItem(catId);
    const res = await fetch(`/api/rab/${rab.id}/categories/${catId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Item baru",
        volume: "1",
        unit: "buah",
        unitPrice: "0",
      }),
    });
    const json = await safeJson(res);
    setSavingItem(null);
    if (!res.ok) {
      toast.error(json.error?.message ?? "Gagal menambah item");
      return;
    }
    const created = json.data as {
      id: string;
      name: string;
      volume: string;
      unit: string;
      unitPrice: string;
      notes: string | null;
      order: number;
    };
    setCategories((prev) =>
      prev.map((c) =>
        c.id === catId
          ? {
              ...c,
              items: [...c.items, { ...created, volume: created.volume.toString(), unitPrice: created.unitPrice.toString() }],
            }
          : c,
      ),
    );
    router.refresh();
  }

  function patchItemLocal(catId: string, itemId: string, patch: Partial<Item>) {
    setCategories((prev) =>
      prev.map((c) =>
        c.id === catId
          ? { ...c, items: c.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)) }
          : c,
      ),
    );
  }

  async function commitItem(catId: string, itemId: string, patch: Partial<Item>) {
    await fetch(`/api/rab/${rab.id}/categories/${catId}/items/${itemId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  }

  async function deleteItem(catId: string, itemId: string) {
    const res = await fetch(
      `/api/rab/${rab.id}/categories/${catId}/items/${itemId}`,
      { method: "DELETE" },
    );
    if (!res.ok) {
      toast.error("Gagal menghapus item");
      return;
    }
    setCategories((prev) =>
      prev.map((c) =>
        c.id === catId ? { ...c, items: c.items.filter((it) => it.id !== itemId) } : c,
      ),
    );
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/30 p-4">
        <div>
          <p className="text-xs text-muted-foreground">Grand Total</p>
          <p className="text-2xl font-bold">{formatRupiah(total)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/api/rab/${rab.id}/export/pdf`}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <FileDown className="mr-2 h-4 w-4" /> PDF
          </a>
          <a
            href={`/api/rab/${rab.id}/export/xlsx`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <Download className="mr-2 h-4 w-4" /> Excel
          </a>
          <a
            href={`/api/rab/${rab.id}/export/docx`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <Download className="mr-2 h-4 w-4" /> Word
          </a>
        </div>
      </div>

      {categories.map((cat) => {
        const subtotal = categoryTotal(cat.items);
        return (
          <Card key={cat.id}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
              {canEdit ? (
                <Input
                  value={cat.name}
                  onChange={(e) => renameCategory(cat.id, e.target.value)}
                  onBlur={(e) => commitRenameCategory(cat.id, e.target.value)}
                  className="max-w-md text-base font-semibold"
                />
              ) : (
                <CardTitle>{cat.name}</CardTitle>
              )}
              {canEdit && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => deleteCategory(cat.id)}
                  aria-label="Hapus kategori"
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {/* Mobile: baris → card supaya tidak horizontal-scroll. */}
              {cat.items.length === 0 ? (
                <p className="rounded-md border border-dashed py-6 text-center text-xs italic text-muted-foreground">
                  Belum ada item.
                </p>
              ) : (
                <div className="space-y-2 md:hidden">
                  {cat.items.map((it) => (
                    <div key={it.id} className="rounded-lg border bg-muted/20 p-3">
                      {canEdit ? (
                        <Input
                          value={it.name}
                          onChange={(e) =>
                            patchItemLocal(cat.id, it.id, { name: e.target.value })
                          }
                          onBlur={(e) =>
                            commitItem(cat.id, it.id, { name: e.target.value })
                          }
                          placeholder="Uraian"
                          className="h-9 font-medium"
                        />
                      ) : (
                        <p className="font-medium">{it.name}</p>
                      )}
                      <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="mb-1 text-[10px] uppercase text-muted-foreground">
                            Vol
                          </p>
                          {canEdit ? (
                            <Input
                              type="number"
                              inputMode="decimal"
                              step="0.01"
                              min="0"
                              value={it.volume}
                              onChange={(e) =>
                                patchItemLocal(cat.id, it.id, { volume: e.target.value })
                              }
                              onBlur={(e) =>
                                commitItem(cat.id, it.id, { volume: e.target.value })
                              }
                              className="h-8 text-right tabular-nums"
                            />
                          ) : (
                            <p className="text-right tabular-nums">
                              {formatQuantity(it.volume)}
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="mb-1 text-[10px] uppercase text-muted-foreground">
                            Satuan
                          </p>
                          {canEdit ? (
                            <Input
                              value={it.unit}
                              onChange={(e) =>
                                patchItemLocal(cat.id, it.id, { unit: e.target.value })
                              }
                              onBlur={(e) =>
                                commitItem(cat.id, it.id, { unit: e.target.value })
                              }
                              className="h-8"
                            />
                          ) : (
                            <p>{it.unit}</p>
                          )}
                        </div>
                        <div>
                          <p className="mb-1 text-[10px] uppercase text-muted-foreground">
                            Harga
                          </p>
                          {canEdit ? (
                            <Input
                              type="number"
                              inputMode="numeric"
                              step="1"
                              min="0"
                              value={it.unitPrice}
                              onChange={(e) =>
                                patchItemLocal(cat.id, it.id, {
                                  unitPrice: e.target.value,
                                })
                              }
                              onBlur={(e) =>
                                commitItem(cat.id, it.id, { unitPrice: e.target.value })
                              }
                              className="h-8 text-right tabular-nums"
                            />
                          ) : (
                            <p className="text-right tabular-nums">
                              {formatRupiah(Number(it.unitPrice))}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between border-t pt-2">
                        <p className="text-xs text-muted-foreground">Subtotal</p>
                        <p className="text-sm font-semibold tabular-nums">
                          {formatRupiah(itemSubtotal(it))}
                        </p>
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => deleteItem(cat.id, it.id)}
                            aria-label="Hapus item"
                            className="ml-2"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Desktop: tabel klasik. */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="border-b bg-muted/40 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Uraian</th>
                      <th className="px-3 py-2 text-right">Volume</th>
                      <th className="px-3 py-2">Satuan</th>
                      <th className="px-3 py-2 text-right">Harga Satuan</th>
                      <th className="px-3 py-2 text-right">Subtotal</th>
                      {canEdit && <th className="w-8" />}
                    </tr>
                  </thead>
                  <tbody>
                    {cat.items.length === 0 && (
                      <tr>
                        <td
                          colSpan={canEdit ? 6 : 5}
                          className="py-4 text-center text-xs italic text-muted-foreground"
                        >
                          Belum ada item.
                        </td>
                      </tr>
                    )}
                    {cat.items.map((it) => (
                      <tr
                        key={it.id}
                        className="border-b last:border-0 hover:bg-muted/20"
                      >
                        <td className="px-3 py-2 align-top">
                          {canEdit ? (
                            <Input
                              value={it.name}
                              onChange={(e) =>
                                patchItemLocal(cat.id, it.id, { name: e.target.value })
                              }
                              onBlur={(e) =>
                                commitItem(cat.id, it.id, { name: e.target.value })
                              }
                              className="h-8 border-transparent bg-transparent hover:border-input focus:border-input"
                            />
                          ) : (
                            it.name
                          )}
                        </td>
                        <td className="px-3 py-2 text-right align-top">
                          {canEdit ? (
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              inputMode="decimal"
                              value={it.volume}
                              onChange={(e) =>
                                patchItemLocal(cat.id, it.id, { volume: e.target.value })
                              }
                              onBlur={(e) =>
                                commitItem(cat.id, it.id, { volume: e.target.value })
                              }
                              className="h-8 border-transparent bg-transparent text-right tabular-nums hover:border-input focus:border-input"
                            />
                          ) : (
                            formatQuantity(it.volume)
                          )}
                        </td>
                        <td className="px-3 py-2 align-top">
                          {canEdit ? (
                            <Input
                              value={it.unit}
                              onChange={(e) =>
                                patchItemLocal(cat.id, it.id, { unit: e.target.value })
                              }
                              onBlur={(e) =>
                                commitItem(cat.id, it.id, { unit: e.target.value })
                              }
                              className="h-8 w-24 border-transparent bg-transparent hover:border-input focus:border-input"
                            />
                          ) : (
                            it.unit
                          )}
                        </td>
                        <td className="px-3 py-2 text-right align-top">
                          {canEdit ? (
                            <Input
                              type="number"
                              step="1"
                              min="0"
                              inputMode="numeric"
                              value={it.unitPrice}
                              onChange={(e) =>
                                patchItemLocal(cat.id, it.id, {
                                  unitPrice: e.target.value,
                                })
                              }
                              onBlur={(e) =>
                                commitItem(cat.id, it.id, { unitPrice: e.target.value })
                              }
                              className="h-8 border-transparent bg-transparent text-right tabular-nums hover:border-input focus:border-input"
                            />
                          ) : (
                            formatRupiah(Number(it.unitPrice))
                          )}
                        </td>
                        <td className="px-3 py-2 text-right align-top font-semibold tabular-nums">
                          {formatRupiah(itemSubtotal(it))}
                        </td>
                        {canEdit && (
                          <td className="align-top">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => deleteItem(cat.id, it.id)}
                              aria-label="Hapus item"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-muted/40">
                      <td
                        colSpan={4}
                        className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                      >
                        Subtotal {cat.name}
                      </td>
                      <td className="px-3 py-2 text-right text-base font-bold tabular-nums">
                        {formatRupiah(subtotal)}
                      </td>
                      {canEdit && <td />}
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Mobile subtotal footer */}
              <div className="mt-3 flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 md:hidden">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Subtotal {cat.name}
                </span>
                <span className="text-base font-bold tabular-nums">
                  {formatRupiah(subtotal)}
                </span>
              </div>

              {canEdit && (
                <div className="mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addItem(cat.id)}
                    disabled={savingItem === cat.id}
                  >
                    {savingItem === cat.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="mr-2 h-4 w-4" />
                    )}
                    Tambah Item
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {canEdit && (
        <form
          onSubmit={addCategory}
          className="flex flex-wrap items-center gap-2 rounded-md border border-dashed p-3"
        >
          <Input
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Nama kategori baru (mis. Konsumsi, ATK, Transportasi)"
            className="max-w-md"
            disabled={addingCat}
          />
          <Button type="submit" size="sm" disabled={addingCat || !newCategoryName.trim()}>
            {addingCat && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Plus className="mr-2 h-4 w-4" /> Tambah Kategori
          </Button>
        </form>
      )}
    </div>
  );
}
