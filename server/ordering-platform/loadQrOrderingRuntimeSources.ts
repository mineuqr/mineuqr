import { ORDERING_CHANNEL_QR } from "@shared/ordering-platform/orderingPlatformContracts";
import type { OrderingRuntimeMaterializationRequest } from "@shared/ordering-platform/orderingRuntimeMaterializationContract";
import { resolveBusinessDayKey, resolveNormalizedOpeningHours } from "@shared/utils/businessDay";
import {
  APP_TIMEZONE,
  isRestaurantOpenNow,
  parseTemporaryClosure,
} from "@shared/utils/restaurantHours";
import { todayYmd } from "@shared/utils/timezone";
import { resolveGuestOrderingAllowed } from "../commercial/guestOrderingAuthority";
import { resolveOwnerEntitlements } from "../subscription-runtime";
import { isFrozenCommercialAccountState } from "../subscription-runtime/commercialAccountState";
import {
  getActiveOffersByRestaurant,
  getCategoriesByRestaurant,
  getHolidaysByRestaurant,
  getMenuItemsByRestaurant,
  getRestaurantBySlug,
} from "../db";

/**
 * QR-ORDERING-RUNTIME-MIGRATION-1 — repository/source loader for QR runtime.
 *
 * Collects authoritative fragments only. Does NOT compose OrderingRuntimeContext.
 * Composition remains OrderingRuntimeMaterializer exclusively.
 */

export type QrOrderingRuntimeRestaurantRow = NonNullable<
  Awaited<ReturnType<typeof getRestaurantBySlug>>
>;

export type QrOrderingRuntimeLoadResult = {
  request: OrderingRuntimeMaterializationRequest;
  /** Display-only restaurant row for QR templates (not ordering gates). */
  restaurantPresentation: QrOrderingRuntimeRestaurantRow;
};

export class QrOrderingRuntimeLoadError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "QrOrderingRuntimeLoadError";
    this.code = code;
  }
}

export async function loadQrOrderingRuntimeSources(params: {
  slug: string;
  now?: Date;
}): Promise<QrOrderingRuntimeLoadResult> {
  const now = params.now ?? new Date();
  const restaurant = await getRestaurantBySlug(params.slug);
  if (!restaurant) {
    throw new QrOrderingRuntimeLoadError("RESTAURANT_NOT_FOUND", "Restaurant not found");
  }

  const restaurantId = restaurant.id;
  const [categories, products, offers, holidays, guest, ownerEntitlements] =
    await Promise.all([
      getCategoriesByRestaurant(restaurantId),
      getMenuItemsByRestaurant(restaurantId),
      getActiveOffersByRestaurant(restaurantId),
      getHolidaysByRestaurant(restaurantId),
      resolveGuestOrderingAllowed(restaurantId, now),
      resolveOwnerEntitlements(restaurant.userId, { now }),
    ]);
  const commerciallyFrozen = isFrozenCommercialAccountState(
    (ownerEntitlements.meta as { commercialAccountState?: string } | undefined)
      ?.commercialAccountState
  );

  const today = todayYmd(now);
  const upcomingHolidays = holidays.filter((h) => h.date >= today);

  const closure = parseTemporaryClosure(restaurant.temporaryClosure);
  const closureActive = Boolean(closure?.active);
  const isOpenNow = isRestaurantOpenNow({
    workingHours: restaurant.workingHours,
    temporaryClosure: restaurant.temporaryClosure,
    now,
    timeZone: APP_TIMEZONE,
    applyTemporaryClosure: true,
  });

  const normalizedHours = resolveNormalizedOpeningHours(restaurant.workingHours ?? null);
  const businessDay = normalizedHours
    ? resolveBusinessDayKey(now, normalizedHours, APP_TIMEZONE)
    : todayYmd(now);

  const currency = (restaurant.currencyCode || "SAR").trim() || "SAR";
  const isActive = restaurant.isActive !== false && !commerciallyFrozen;
  const guestOrderingEnabled = guest.canOrder === true && !commerciallyFrozen;

  const request: OrderingRuntimeMaterializationRequest = {
    channel: ORDERING_CHANNEL_QR,
    restaurant: {
      id: restaurant.id,
      slug: restaurant.slug,
      name: restaurant.nameAr,
      currency,
      timezone: APP_TIMEZONE,
    },
    business: {
      businessId: String(restaurant.id),
      businessDay,
      orderingAvailable: isActive,
      closureActive,
    },
    hours: {
      schedule: restaurant.workingHours ? [restaurant.workingHours] : [],
      isOpenNow,
      nextOpenAt: null,
      nextCloseAt: null,
    },
    availability: {
      canBrowse: isActive,
      canPlaceOrder: guestOrderingEnabled,
      reasons: commerciallyFrozen ? ["commercial_account_frozen"] : [],
    },
    locale: {
      language: "ar",
      direction: "rtl",
      theme: restaurant.menuTemplate ?? null,
    },
    menu: {
      projectionVersion: `qr-${restaurant.id}-${restaurant.updatedAt}`,
      categories: commerciallyFrozen ? [] : categories,
      products: commerciallyFrozen ? [] : products,
      modifiers: [],
      offers: commerciallyFrozen ? [] : offers,
      availability: commerciallyFrozen ? [] : upcomingHolidays,
    },
    policies: {
      cartConstraints: {},
      checkoutRules: { requireTable: true },
      guest: {
        guestOrderingEnabled,
        requireCustomerName: false,
        requireCustomerPhone: false,
        allowSpecialInstructions: true,
      },
    },
    pricing: {
      currency,
      taxes: [],
      serviceCharge: null,
      discountPipeline: [],
    },
    capabilities: {
      supportedChannels: [ORDERING_CHANNEL_QR],
    },
    featureFlags: {
      guest_ordering: guestOrderingEnabled,
      commercial_frozen: commerciallyFrozen,
    },
    now,
  };

  return {
    request,
    restaurantPresentation: restaurant,
  };
}
