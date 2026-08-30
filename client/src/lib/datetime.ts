/**
 * Client compatibility layer — canonical logic lives in @shared/utils/timezone.
 * Import paths under @/lib/datetime remain stable for client code.
 */

export {
  APP_TIMEZONE,
  parseStoredUtcInstant,
  parseDbUtcTimestamp,
  type RestaurantNow,
  type RestaurantLocalTime,
  todayYmd,
  getRestaurantNow,
  convertUtcToRestaurantTime,
  formatInRestaurantTimezone,
  formatRiyadhDateTime,
  formatRiyadhDate,
  formatRiyadhTime,
  parseCivilDateYmd,
  addCivilCalendarDays,
  addCivilCalendarMonths,
  addCivilCalendarYears,
  civilDateToPeriodEndInstant,
  periodEndInstantAfterCivilOffset,
  InvalidCivilDateError,
} from "@shared/utils/timezone";
