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
import {
  APP_TIMEZONE,
  getRestaurantNow,
  parseStoredUtcInstant,
  restaurantLocalWallToUtcIso,
} from "./timezone";

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

  const startUtc = restaurantLocalWallToUtcIso(startLocal, timeZone);
  const endUtc = restaurantLocalWallToUtcIso(endLocal, timeZone);

  return { businessDay, startIso: startUtc, endIso: endUtc };
}
