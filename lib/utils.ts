import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Constructing an Intl.NumberFormat / Intl.DateTimeFormat is surprisingly slow
// (0.5–2 ms each). At list-render time we call these formatters hundreds of
// times per page. Cache instances so we only pay the cost once per configuration.
const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatCurrency(amount: number | string): string {
  const value = typeof amount === "string" ? Number(amount) : amount;
  return rupiah.format(value);
}

const dateFmtCache = new Map<string, Intl.DateTimeFormat>();
function getDateFmt(opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = JSON.stringify(opts);
  let fmt = dateFmtCache.get(key);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("id-ID", opts);
    dateFmtCache.set(key, fmt);
  }
  return fmt;
}

const DEFAULT_DATE_OPTS: Intl.DateTimeFormatOptions = { dateStyle: "long" };
const DEFAULT_DATETIME_OPTS: Intl.DateTimeFormatOptions = {
  dateStyle: "medium",
  timeStyle: "short",
};

export function formatDate(date: Date | string, opts?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return getDateFmt(opts ?? DEFAULT_DATE_OPTS).format(d);
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return getDateFmt(DEFAULT_DATETIME_OPTS).format(d);
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
