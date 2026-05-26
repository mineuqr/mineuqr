/**
 * Client compatibility layer — canonical logic lives in @shared/utils/restaurantHours.
 * Import paths under @/lib/restaurantHours remain stable for client code.
 */

export {
  APP_TIMEZONE,
  WEEKDAY_KEYS,
  type WeekdayKey,
  type DayHours,
  type NormalizedWorkingHours,
  type TemporaryClosure,
  type OpenStatusResult,
  padTimeString,
  normalizeWorkingHours,
  parseTemporaryClosure,
  timeToMinutes,
  isOpenInRange,
  isRestaurantOpen,
  isRestaurantOpenNow,
  getOpenStatusFromRestaurant,
} from "@shared/utils/restaurantHours";

export {
  type RestaurantNow,
  todayYmd,
  getRestaurantNow,
} from "@shared/utils/timezone";
