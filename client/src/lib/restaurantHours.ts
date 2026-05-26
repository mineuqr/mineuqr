import { APP_TIMEZONE } from "./datetime";

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

export type RestaurantNow = {
  date: Date;
  ymd: string;
  weekdayIndex: number;
  minutes: number;
};

export type TemporaryClosure = {
  active?: boolean;
  message?: string;
};

function padTimeComponent(value: number): string {
  return String(value).padStart(2, "0");
}

/** Normalize HH:mm to zero-padded 24h form. */
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

function getWeekdayIndex(date: Date, timeZone: string): number {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(date);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[weekday] ?? 0;
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
 * Current restaurant wall clock in the given timezone (default APP_TIMEZONE).
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
 * Calendar date YYYY-MM-DD in the given timezone (default APP_TIMEZONE).
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
 * Parse and normalize working-hours JSON without mutating the input.
 */
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
    const parsed =
      typeof raw === "string" ? JSON.parse(raw) : raw;
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

/** True when nowMinutes falls within open–close, including overnight (close < open). */
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

/**
 * Central open/closed predicate from working hours (and optional temporary closure).
 */
export function isRestaurantOpen(params: {
  workingHours: unknown;
  temporaryClosure?: unknown;
  now?: Date;
  timeZone?: string;
  /**
   * When true, temporaryClosure.active forces closed.
   * Default false to preserve menu badge behavior (banner handles temp closure separately).
   */
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
