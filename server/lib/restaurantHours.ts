/**
 * Server compatibility layer — canonical logic lives in @shared/utils/restaurantHours.
 * Import paths under ./lib/restaurantHours remain stable for server code.
 */

export {
  APP_TIMEZONE,
  WEEKDAY_KEYS,
  type WeekdayKey,
  type DayHours,
  type NormalizedWorkingHours,
  type TemporaryClosure,
  padTimeString,
  normalizeWorkingHours,
  parseTemporaryClosure,
  timeToMinutes,
  isOpenInRange,
  isRestaurantOpen,
  isRestaurantOpenNow,
} from "@shared/utils/restaurantHours";

export {
  type RestaurantNow,
  todayYmd,
  getRestaurantNow,
} from "@shared/utils/timezone";
