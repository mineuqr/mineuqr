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
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    ...options,
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
