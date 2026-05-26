/**
 * Working-hours and closure predicates (restaurant wall clock).
 * Uses shared/utils/timezone.ts for APP_TIMEZONE and getRestaurantNow.
 *
 * Migration note: consolidate client/src/lib/restaurantHours.ts and
 * server/lib/restaurantHours.ts to re-export from this module (TZ-4).
 */

import { APP_TIMEZONE, getRestaurantNow } from "./timezone";

export { APP_TIMEZONE };

export const WEEKDAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

export type WeekdayKey = (typeof WEEKDAY_KEYS)[number];

export type DayHours = {
  open: string;
  close: string;
  closed: boolean;
};

export type NormalizedWorkingHours = Record<WeekdayKey, DayHours>;

const DEFAULT_DAY_HOURS: DayHours = {
  open: "09:00",
  close: "23:00",
  closed: false,
};

export type TemporaryClosure = {
  active?: boolean;
  message?: string;
};

function padTimeComponent(value: number): string {
  return String(value).padStart(2, "0");
}

export function padTimeString(hhmm: string): string {
  const trimmed = hhmm.trim();
  const [hStr, mStr] = trimmed.split(":");
  if (hStr === undefined || mStr === undefined) return trimmed;
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return trimmed;
  const hours = Math.min(23, Math.max(0, h));
  const minutes = Math.min(59, Math.max(0, m));
  return `${padTimeComponent(hours)}:${padTimeComponent(minutes)}`;
}

export function normalizeWorkingHours(
  raw: unknown
): NormalizedWorkingHours | null {
  if (raw == null) return null;

  let parsed: Record<string, unknown>;
  try {
    parsed =
      typeof raw === "string"
        ? (JSON.parse(raw) as Record<string, unknown>)
        : (raw as Record<string, unknown>);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object") return null;

  const result = {} as NormalizedWorkingHours;
  for (const day of WEEKDAY_KEYS) {
    const entry = parsed[day];
    if (!entry || typeof entry !== "object") {
      result[day] = { ...DEFAULT_DAY_HOURS, closed: true };
      continue;
    }
    const record = entry as Partial<DayHours>;
    const closed = Boolean(record.closed);
    const open =
      typeof record.open === "string" && record.open.trim()
        ? padTimeString(record.open)
        : DEFAULT_DAY_HOURS.open;
    const close =
      typeof record.close === "string" && record.close.trim()
        ? padTimeString(record.close)
        : DEFAULT_DAY_HOURS.close;
    result[day] = { open, close, closed };
  }

  return result;
}

export function parseTemporaryClosure(
  raw: unknown
): TemporaryClosure | null {
  if (raw == null) return null;
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as TemporaryClosure;
  } catch {
    return null;
  }
}

export function timeToMinutes(hhmm: string): number | null {
  const [hStr, mStr] = hhmm.trim().split(":");
  if (hStr === undefined || mStr === undefined) return null;
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (Number.isNaN(h) || Number.isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) {
    return null;
  }
  return h * 60 + m;
}

export function isOpenInRange(
  open: string,
  close: string,
  nowMinutes: number
): boolean {
  const openMin = timeToMinutes(open);
  const closeMin = timeToMinutes(close);
  if (openMin === null || closeMin === null) return false;
  if (openMin <= closeMin) {
    return nowMinutes >= openMin && nowMinutes <= closeMin;
  }
  return nowMinutes >= openMin || nowMinutes <= closeMin;
}

export function isRestaurantOpen(params: {
  workingHours: unknown;
  temporaryClosure?: unknown;
  now?: Date;
  timeZone?: string;
  applyTemporaryClosure?: boolean;
}): boolean {
  const {
    workingHours,
    temporaryClosure,
    now = new Date(),
    timeZone = APP_TIMEZONE,
    applyTemporaryClosure = false,
  } = params;

  if (applyTemporaryClosure) {
    const closure = parseTemporaryClosure(temporaryClosure);
    if (closure?.active) return false;
  }

  const hours = normalizeWorkingHours(workingHours);
  if (!hours) return false;

  const hasAnyOpen = WEEKDAY_KEYS.some((d) => !hours[d].closed);
  if (!hasAnyOpen) return false;

  const { weekdayIndex, minutes } = getRestaurantNow(now, timeZone);
  const currentDay = WEEKDAY_KEYS[weekdayIndex];
  const currentHour = hours[currentDay];
  if (currentHour.closed) return false;

  return isOpenInRange(currentHour.open, currentHour.close, minutes);
}

/**
 * Authoritative "accepting orders now?" predicate for hours + optional temp closure.
 * When workingHours is absent/null, returns true (backward compatible).
 */
export function isRestaurantOpenNow(params: {
  workingHours?: unknown | null;
  temporaryClosure?: unknown;
  now?: Date;
  timeZone?: string;
  applyTemporaryClosure?: boolean;
}): boolean {
  if (params.applyTemporaryClosure !== false) {
    const closure = parseTemporaryClosure(params.temporaryClosure);
    if (closure?.active) return false;
  }

  if (params.workingHours == null || params.workingHours === "") {
    return true;
  }

  return isRestaurantOpen({
    workingHours: params.workingHours,
    temporaryClosure: params.temporaryClosure,
    now: params.now,
    timeZone: params.timeZone,
    applyTemporaryClosure: false,
  });
}

export type OpenStatusResult = {
  isOpenNow: boolean;
  hours: NormalizedWorkingHours;
  days: readonly WeekdayKey[];
  currentDay: WeekdayKey;
};

/**
 * Menu header open/closed state (working hours only; no temporary closure on badge).
 */
export function getOpenStatusFromRestaurant(params: {
  workingHours: unknown;
  now?: Date;
  timeZone?: string;
}): OpenStatusResult | null {
  const hours = normalizeWorkingHours(params.workingHours);
  if (!hours) return null;

  const hasAnyOpen = WEEKDAY_KEYS.some((d) => !hours[d].closed);
  if (!hasAnyOpen) return null;

  const { weekdayIndex } = getRestaurantNow(
    params.now ?? new Date(),
    params.timeZone
  );
  const currentDay = WEEKDAY_KEYS[weekdayIndex];
  const isOpenNow = isRestaurantOpen({
    workingHours: hours,
    now: params.now,
    timeZone: params.timeZone,
    applyTemporaryClosure: false,
  });

  return {
    isOpenNow,
    hours,
    days: WEEKDAY_KEYS,
    currentDay,
  };
}
