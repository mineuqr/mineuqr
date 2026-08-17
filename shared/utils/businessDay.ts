/**
 * Business day boundaries — restaurant opening time, not calendar midnight.
 * Pure presentation/read utility; not part of the Order aggregate.
 */

import {
  DEFAULT_DAY_HOURS,
  normalizeWorkingHours,
  padTimeString,
  type NormalizedWorkingHours,
  WEEKDAY_KEYS,
} from "./restaurantHours";
import { APP_TIMEZONE, getRestaurantNow, parseStoredUtcInstant } from "./timezone";

export type { NormalizedWorkingHours };

export type BusinessDayWindow = {
  businessDay: string;
  startIso: string;
  endIso: string;
};

function parseMinutes(hhmm: string): number {
  const padded = padTimeString(hhmm);
  const [hStr, mStr] = padded.split(":");
  const h = parseInt(hStr ?? "0", 10);
  const m = parseInt(mStr ?? "0", 10);
  return h * 60 + m;
}

function subtractCalendarDaysYmd(ymd: string, days: number): string {
  const [y, mo, d] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(y, mo - 1, d));
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function addCalendarDaysYmd(ymd: string, days: number): string {
  const [y, mo, d] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(y, mo - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function resolveNormalizedOpeningHours(raw: unknown): NormalizedWorkingHours {
  return normalizeWorkingHours(raw) ?? normalizeWorkingHours({})!;
}

export function openingMinutesForWeekday(
  hours: NormalizedWorkingHours,
  weekdayIndex: number
): number {
  const key = WEEKDAY_KEYS[weekdayIndex] ?? "monday";
  const day = hours[key] ?? DEFAULT_DAY_HOURS;
  if (day.closed) {
    return parseMinutes(DEFAULT_DAY_HOURS.open);
  }
  return parseMinutes(day.open);
}

/**
 * Resolve which business day an instant belongs to.
 * Before today's opening → previous calendar date's business day.
 */
export function resolveBusinessDayKey(
  instant: string | Date,
  workingHours: NormalizedWorkingHours,
  timeZone: string = APP_TIMEZONE
): string {
  const date = typeof instant === "string" ? parseStoredUtcInstant(instant) : instant;
  if (!date) {
    return getRestaurantNow(new Date(), timeZone).ymd;
  }

  const local = getRestaurantNow(date, timeZone);
  const openingMinutes = openingMinutesForWeekday(workingHours, local.weekdayIndex);

  if (local.minutes < openingMinutes) {
    return subtractCalendarDaysYmd(local.ymd, 1);
  }
  return local.ymd;
}

/**
 * UTC bounds [start, end) for a business day in restaurant local time.
 */
export function resolveBusinessDayWindow(
  businessDay: string,
  workingHours: NormalizedWorkingHours,
  timeZone: string = APP_TIMEZONE
): BusinessDayWindow {
  const [y, mo, d] = businessDay.split("-").map(Number);
  const anchor = new Date(`${businessDay}T12:00:00Z`);
  const weekdayIndex = getRestaurantNow(anchor, timeZone).weekdayIndex;
  const openMinutes = openingMinutesForWeekday(workingHours, weekdayIndex);
  const openHour = Math.floor(openMinutes / 60);
  const openMinute = openMinutes % 60;

  const startLocal = `${businessDay}T${String(openHour).padStart(2, "0")}:${String(openMinute).padStart(2, "0")}:00`;
  const nextDay = addCalendarDaysYmd(businessDay, 1);
  const nextAnchor = new Date(`${nextDay}T12:00:00Z`);
  const nextWeekdayIndex = getRestaurantNow(nextAnchor, timeZone).weekdayIndex;
  const nextOpenMinutes = openingMinutesForWeekday(workingHours, nextWeekdayIndex);
  const nextOpenHour = Math.floor(nextOpenMinutes / 60);
  const nextOpenMinute = nextOpenMinutes % 60;
  const endLocal = `${nextDay}T${String(nextOpenHour).padStart(2, "0")}:${String(nextOpenMinute).padStart(2, "0")}:00`;

  const startUtc = localWallToUtcIso(startLocal, timeZone);
  const endUtc = localWallToUtcIso(endLocal, timeZone);

  return { businessDay, startIso: startUtc, endIso: endUtc };
}

/**
 * Convert a restaurant-local wall clock (`YYYY-MM-DDTHH:mm:ss`) to a UTC ISO instant.
 *
 * Must be host-timezone independent. Never parse the wall string with `new Date(localIso)`
 * (ES treats timezone-less ISO as *host* local, which double-applies the offset when the
 * host TZ equals `timeZone` and truncates business-day windows).
 */
function localWallToUtcIso(localIso: string, timeZone: string): string {
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

  // Treat wall components as UTC for the initial guess, then refine using target TZ.
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
