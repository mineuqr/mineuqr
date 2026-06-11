/**
 * ADMIN-SECURITY-CENTER PR-6 — query limits for audit read APIs.
 */
import { TRPCError } from "@trpc/server";

export const AUDIT_LIST_DEFAULT_LIMIT = 50;
export const AUDIT_LIST_MAX_LIMIT = 200;
export const AUDIT_STATS_DEFAULT_RANGE_DAYS = 7;
export const AUDIT_MAX_RANGE_DAYS = 90;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function clampAuditListLimit(limit: number | undefined): number {
  if (limit === undefined || !Number.isFinite(limit)) {
    return AUDIT_LIST_DEFAULT_LIMIT;
  }
  const rounded = Math.floor(limit);
  if (rounded < 1) return 1;
  return Math.min(rounded, AUDIT_LIST_MAX_LIMIT);
}

export function parseAuditIsoDate(value: string, field: string): Date {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Invalid ${field} date: expected ISO-8601 timestamp`,
    });
  }
  return parsed;
}

export function resolveAuditDateRange(input: {
  from?: string;
  to?: string;
  defaultRangeDays?: number;
}): { from: Date; to: Date } {
  const defaultDays = input.defaultRangeDays ?? AUDIT_STATS_DEFAULT_RANGE_DAYS;
  const to = input.to ? parseAuditIsoDate(input.to, "to") : new Date();
  const from = input.from
    ? parseAuditIsoDate(input.from, "from")
    : new Date(to.getTime() - defaultDays * MS_PER_DAY);

  if (from.getTime() > to.getTime()) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "`from` must be before or equal to `to`",
    });
  }

  const rangeDays = (to.getTime() - from.getTime()) / MS_PER_DAY;
  if (rangeDays > AUDIT_MAX_RANGE_DAYS) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Date range cannot exceed ${AUDIT_MAX_RANGE_DAYS} days`,
    });
  }

  return { from, to };
}

export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}
