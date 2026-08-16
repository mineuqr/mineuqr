/**
 * POS-PERSISTENCE-WIRING-1
 * MySQL uniqueness + timestamp helpers for POS stores.
 * Not a generic persistence framework.
 */

import { getDb } from "../../db";

export type LoadPosDb = typeof getDb;

export const POS_DATABASE_UNAVAILABLE = "database_unavailable";

export class PosTerminalCodeConflictError extends Error {
  constructor() {
    super("pos_terminal_code_conflict");
    this.name = "PosTerminalCodeConflictError";
  }
}

export class PosSaleIdempotencyConflictError extends Error {
  constructor() {
    super("pos_sale_idempotency_conflict");
    this.name = "PosSaleIdempotencyConflictError";
  }
}

export class PosSaleIdempotencyUniqueCollisionError extends Error {
  constructor() {
    super("pos_sale_idempotency_unique_collision");
    this.name = "PosSaleIdempotencyUniqueCollisionError";
  }
}

export function isMysqlDuplicateKeyError(error: unknown): boolean {
  const errno = errnoFromError(error);
  if (errno === 1062) return true;
  const code = codeFromError(error);
  if (code === "ER_DUP_ENTRY") return true;
  if (error instanceof Error && /duplicate/i.test(error.message)) return true;
  return false;
}

function errnoFromError(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;
  const candidate = error as { errno?: number; cause?: unknown };
  if (typeof candidate.errno === "number") return candidate.errno;
  if (candidate.cause) return errnoFromError(candidate.cause);
  return null;
}

function codeFromError(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const candidate = error as { code?: string; cause?: unknown };
  if (typeof candidate.code === "string") return candidate.code;
  if (candidate.cause) return codeFromError(candidate.cause);
  return null;
}

/** Persist domain ISO timestamps as MySQL TIMESTAMP strings. */
export function toMysqlTimestampString(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return typeof value === "string" ? value : "1970-01-01 00:00:00";
  }
  return date.toISOString().slice(0, 19).replace("T", " ");
}

/** Map MySQL TIMESTAMP / Date rows back to ISO-8601 for the POS domain. */
export function fromMysqlTimestampString(value: string | Date): string {
  if (value instanceof Date) return value.toISOString();
  const normalized = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString();
}
