/**
 * Central timezone utilities for MineuQR.
 * Store instants in UTC; interpret and display in restaurant timezone (default Riyadh).
 *
 * Migration note: client/src/lib/datetime.ts and server/lib/restaurantHours.ts
 * should gradually re-export or delegate here. Do not remove legacy modules until
 * call sites are migrated (TZ-4+).
 */

export const APP_TIMEZONE = "Asia/Riyadh";

export type RestaurantNow = {
  /** Reference instant (UTC internally). */
  date: Date;
  ymd: string;
  weekdayIndex: number;
  minutes: number;
};

export type RestaurantLocalTime = RestaurantNow & {
  hour: number;
  minute: number;
};

const WEEKDAY_SHORT_TO_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/**
 * Parse DB/API timestamps stored as UTC without a Z suffix.
 * Examples: "2026-05-23 12:34:56", "2026-05-23T12:34:56.000Z"
 */
export function parseStoredUtcInstant(
  value: string | Date | null | undefined
): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  if (/[zZ]$/.test(trimmed) || /[+-]\d{2}:\d{2}$/.test(trimmed)) {
    const d = new Date(trimmed);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const isoLike = trimmed.includes("T") ? trimmed : trimmed.replace(" ", "T");
  const d = new Date(`${isoLike}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** @deprecated alias — use parseStoredUtcInstant */
export const parseDbUtcTimestamp = parseStoredUtcInstant;

function getWeekdayIndex(date: Date, timeZone: string): number {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(date);
  return WEEKDAY_SHORT_TO_INDEX[weekday] ?? 0;
}

function getMinutesOfDay(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
  return hour * 60 + minute;
}

/**
 * Calendar date YYYY-MM-DD in the given timezone.
 */
export function todayYmd(
  now: Date = new Date(),
  timeZone: string = APP_TIMEZONE
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * Current wall clock in restaurant timezone (default APP_TIMEZONE).
 */
export function getRestaurantNow(
  now: Date = new Date(),
  timeZone: string = APP_TIMEZONE
): RestaurantNow {
  return {
    date: now,
    ymd: todayYmd(now, timeZone),
    weekdayIndex: getWeekdayIndex(now, timeZone),
    minutes: getMinutesOfDay(now, timeZone),
  };
}

/**
 * Convert a stored UTC instant to restaurant-local calendar/time components.
 */
export function convertUtcToRestaurantTime(
  value: string | Date | null | undefined,
  timeZone: string = APP_TIMEZONE
): RestaurantLocalTime | null {
  const instant = parseStoredUtcInstant(value);
  if (!instant) return null;
  const base = getRestaurantNow(instant, timeZone);
  return {
    ...base,
    hour: Math.floor(base.minutes / 60),
    minute: base.minutes % 60,
  };
}

export function formatInRestaurantTimezone(
  value: string | Date | null | undefined,
  locale: string,
  options?: Intl.DateTimeFormatOptions,
  timeZone: string = APP_TIMEZONE
): string {
  const date = parseStoredUtcInstant(value);
  if (!date) return "";
  // GLOBAL-NUMERIC-PRESENTATION-POLICY-1 — Western digits for all locales.
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    ...options,
    numberingSystem: "latn",
  }).format(date);
}

/** Display formatters fixed to APP_TIMEZONE (Riyadh). */
export function formatRiyadhDateTime(
  value: string | Date | null | undefined,
  locale: string,
  options?: Intl.DateTimeFormatOptions
): string {
  return formatInRestaurantTimezone(value, locale, options, APP_TIMEZONE);
}

export function formatRiyadhDate(
  value: string | Date | null | undefined,
  locale: string
): string {
  return formatRiyadhDateTime(value, locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatRiyadhTime(
  value: string | Date | null | undefined,
  locale: string
): string {
  return formatRiyadhDateTime(value, locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export type BusinessYearMonth = {
  year: number;
  month: number;
};

/** Calendar year/month in APP_TIMEZONE for a stored instant (Dashboard TZ-5a compatible). */
export function restaurantYearMonth(
  value: string | Date | null | undefined,
  timeZone: string = APP_TIMEZONE
): BusinessYearMonth | null {
  const local = convertUtcToRestaurantTime(value, timeZone);
  if (!local?.ymd) return null;
  const [year, month] = local.ymd.split("-").map(Number);
  return year && month ? { year, month } : null;
}

/** Business calendar year/month N months before the anchor instant (0 = current month). */
export function businessYearMonthMonthsAgo(
  monthsAgo: number,
  now: Date = new Date(),
  timeZone: string = APP_TIMEZONE
): BusinessYearMonth {
  const anchor = getRestaurantNow(now, timeZone);
  let year = Number(anchor.ymd.slice(0, 4));
  let month = Number(anchor.ymd.slice(5, 7));
  month -= monthsAgo;
  while (month <= 0) {
    month += 12;
    year -= 1;
  }
  return { year, month };
}

/** True when a stored UTC instant falls in the given business calendar month. */
export function isInBusinessYearMonth(
  value: string | Date | null | undefined,
  year: number,
  month: number,
  timeZone: string = APP_TIMEZONE
): boolean {
  const ym = restaurantYearMonth(value, timeZone);
  return ym !== null && ym.year === year && ym.month === month;
}

/** Chart label for a business calendar month (e.g. "May 2026"). */
export function formatBusinessYearMonthLabel(
  year: number,
  month: number,
  locale: string = "en-US",
  timeZone: string = APP_TIMEZONE
): string {
  const paddedMonth = String(month).padStart(2, "0");
  const sample = parseStoredUtcInstant(`${year}-${paddedMonth}-15T12:00:00Z`);
  if (!sample) return `${month}/${year}`;
  return formatInRestaurantTimezone(
    sample,
    locale,
    { year: "numeric", month: "short" },
    timeZone
  );
}

// ─── CIVIL-DATE-PERIOD-END-INSTANT-HARDENING-1 ─────────────────────────────

const CIVIL_DATE_YMD = /^(\d{4})-(\d{2})-(\d{2})$/;

export class InvalidCivilDateError extends Error {
  readonly code = "INVALID_CIVIL_DATE" as const;

  constructor(message: string) {
    super(message);
    this.name = "InvalidCivilDateError";
  }
}

export type CivilDateParts = {
  year: number;
  month: number;
  day: number;
};

/**
 * Parse and validate a Gregorian civil date `YYYY-MM-DD`.
 * Rejects malformed strings and non-existent calendar dates (no silent rollover).
 */
export function parseCivilDateYmd(value: string): CivilDateParts {
  const trimmed = String(value ?? "").trim();
  const match = CIVIL_DATE_YMD.exec(trimmed);
  if (!match) {
    throw new InvalidCivilDateError(`Invalid civil date: ${String(value)}`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    throw new InvalidCivilDateError(`Invalid civil date: ${trimmed}`);
  }
  return { year, month, day };
}

export function formatCivilDateYmd(parts: CivilDateParts): string {
  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

/**
 * Convert a restaurant-local wall clock (`YYYY-MM-DDTHH:mm:ss`) to a UTC ISO instant.
 * Host-timezone independent (same algorithm as business-day windows).
 */
export function restaurantLocalWallToUtcIso(
  localIso: string,
  timeZone: string
): string {
  const normalized = localIso.includes("T") ? localIso : localIso.replace(" ", "T");
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/.exec(normalized);
  if (!match) {
    throw new Error(`Invalid local wall clock: ${localIso}`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const desiredAsUtcMs = Date.UTC(year, month - 1, day, hour, minute, second);

  let utcMs = desiredAsUtcMs;
  for (let i = 0; i < 3; i++) {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(new Date(utcMs));

    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
    const shownAsUtcMs = Date.UTC(
      parseInt(get("year"), 10),
      parseInt(get("month"), 10) - 1,
      parseInt(get("day"), 10),
      parseInt(get("hour"), 10),
      parseInt(get("minute"), 10),
      parseInt(get("second"), 10)
    );
    utcMs -= shownAsUtcMs - desiredAsUtcMs;
  }

  return new Date(utcMs).toISOString();
}

/** Add signed calendar days to a civil date (UTC-calendar arithmetic on YMD components). */
export function addCivilCalendarDays(civilDate: string, days: number): string {
  const { year, month, day } = parseCivilDateYmd(civilDate);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Add signed calendar months with JavaScript `Date#setMonth` overflow semantics
 * (e.g. Jan 31 + 1 month → Mar 3), applied to civil YMD — not host-local.
 */
export function addCivilCalendarMonths(civilDate: string, months: number): string {
  const { year, month, day } = parseCivilDateYmd(civilDate);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}

export function addCivilCalendarYears(civilDate: string, years: number): string {
  return addCivilCalendarMonths(civilDate, years * 12);
}

/**
 * Civil date → exclusive period-end UTC instant.
 *
 * Semantics (subscription entitlement uses `now >= periodEnd` ⇒ expired):
 * active through the entire business civil date in `timeZone`, then expires at
 * local midnight starting the next civil day.
 *
 * Pure and host-TZ independent. Caller must pass an explicit IANA timezone
 * (production callers use `APP_TIMEZONE`).
 */
export function civilDateToPeriodEndInstant(
  civilDate: string,
  timeZone: string
): Date {
  parseCivilDateYmd(civilDate);
  const nextDay = addCivilCalendarDays(civilDate, 1);
  const iso = restaurantLocalWallToUtcIso(`${nextDay}T00:00:00`, timeZone);
  return new Date(iso);
}

/**
 * Calendar offset from an anchor instant's civil date in `timeZone`, then
 * exclusive period-end conversion. Used for trial (+N days) and renewal (+N months).
 */
export function periodEndInstantAfterCivilOffset(params: {
  from?: Date;
  timeZone: string;
  days?: number;
  months?: number;
  years?: number;
}): Date {
  const from = params.from ?? new Date();
  let ymd = todayYmd(from, params.timeZone);
  if (params.years) ymd = addCivilCalendarYears(ymd, params.years);
  if (params.months) ymd = addCivilCalendarMonths(ymd, params.months);
  if (params.days) ymd = addCivilCalendarDays(ymd, params.days);
  return civilDateToPeriodEndInstant(ymd, params.timeZone);
}
