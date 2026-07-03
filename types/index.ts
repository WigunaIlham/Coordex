export * from "@/lib/generated/prisma/client";

export type ApiSuccess<T> = { data: T; meta?: Record<string, unknown> };
export type ApiError = { error: { message: string; code?: string } };
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export type WorkloadStatus = "UNDERUTILIZED" | "NORMAL" | "OVERLOADED";
export type StressBand = "RENDAH" | "SEDANG" | "TINGGI";
