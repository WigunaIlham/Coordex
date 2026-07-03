export type RabItemLike = {
  volume: string | number;
  unitPrice: string | number;
};

export function itemSubtotal(item: RabItemLike): number {
  return Number(item.volume) * Number(item.unitPrice);
}

export function categoryTotal(items: RabItemLike[]): number {
  return items.reduce((sum, it) => sum + itemSubtotal(it), 0);
}

export function grandTotal(categories: { items: RabItemLike[] }[]): number {
  return categories.reduce((sum, c) => sum + categoryTotal(c.items), 0);
}

export function formatRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatQuantity(n: string | number): string {
  const v = Number(n);
  if (Number.isInteger(v)) return v.toLocaleString("id-ID");
  return v.toLocaleString("id-ID", { maximumFractionDigits: 2 });
}
