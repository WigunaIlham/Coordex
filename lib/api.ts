import { NextResponse } from "next/server";

export function apiOk<T>(data: T, meta?: Record<string, unknown>, init?: { status?: number }) {
  return NextResponse.json({ data, ...(meta ? { meta } : {}) }, { status: init?.status ?? 200 });
}

export function apiErr(message: string, status = 400, code?: string) {
  return NextResponse.json({ error: { message, ...(code ? { code } : {}) } }, { status });
}
