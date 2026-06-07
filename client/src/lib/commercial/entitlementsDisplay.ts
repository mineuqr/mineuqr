import { FEATURE_KEYS, type FeatureKey } from "@commercial/featureKeys";
import type { CommercialEntitlements } from "@commercial/types";

export type CommercialUiLanguage = "ar" | "en";

const PLAN_LABELS: Record<string, Record<CommercialUiLanguage, string>> = {
  NONE: { en: "No commercial access", ar: "لا يوجد وصول تجاري" },
  TRIAL: { en: "Trial", ar: "تجريبي" },
  BASIC: { en: "Basic", ar: "أساسية" },
  PROFESSIONAL: { en: "Professional", ar: "احترافية" },
  ENTERPRISE: { en: "Enterprise", ar: "مؤسسية" },
  ADMIN: { en: "Admin", ar: "مسؤول" },
};

const ACCOUNT_TYPE_LABELS: Record<string, Record<CommercialUiLanguage, string>> = {
  NONE: { en: "None", ar: "لا شيء" },
  TRIAL: { en: "Trial", ar: "تجريبي" },
  PAYING: { en: "Paying", ar: "مدفوع" },
  ADMIN: { en: "Admin", ar: "مسؤول" },
};

const FEATURE_LABELS: Record<FeatureKey, Record<CommercialUiLanguage, string>> = {
  qrMenu: { en: "QR Menu", ar: "منيو QR" },
  categories: { en: "Categories", ar: "الفئات" },
  menuImages: { en: "Menu images", ar: "صور المنيو" },
  search: { en: "Search", ar: "البحث" },
  ordering: { en: "Ordering", ar: "الطلب" },
  cart: { en: "Cart", ar: "السلة" },
  checkout: { en: "Checkout", ar: "إتمام الطلب" },
  requestBill: { en: "Request bill", ar: "طلب الفاتورة" },
  callWaiter: { en: "Call waiter", ar: "استدعاء النادل" },
  orderTracking: { en: "Order tracking", ar: "تتبع الطلب" },
  thermalPrinting: { en: "Thermal printing", ar: "الطباعة الحرارية" },
  autoPrint: { en: "Auto print", ar: "طباعة تلقائية" },
  reprint: { en: "Reprint", ar: "إعادة الطباعة" },
  reports: { en: "Reports", ar: "التقارير" },
  excelExport: { en: "Excel export", ar: "تصدير Excel" },
  hotelMode: { en: "Hotel mode", ar: "وضع الفندق" },
  roomQr: { en: "Room QR", ar: "QR الغرف" },
  dynamicServiceCatalog: { en: "Dynamic offers", ar: "العروض الديناميكية" },
  templates: { en: "Templates", ar: "القوالب" },
  customColors: { en: "Custom colors", ar: "ألوان مخصصة" },
  customFonts: { en: "Custom fonts", ar: "خطوط مخصصة" },
};

const LIMIT_LABELS = {
  restaurants: { en: "Restaurants", ar: "المطاعم" },
  categories: { en: "Categories per location", ar: "الفئات لكل موقع" },
  items: { en: "Items per location", ar: "الأصناف لكل موقع" },
} as const;

export function commercialEntitlementsQueryEnabled(
  authResolved: boolean,
  isAuthenticated: boolean,
  enabledOverride?: boolean
): boolean {
  if (enabledOverride !== undefined) return enabledOverride;
  return authResolved && isAuthenticated;
}

export function getPlanDisplayName(
  plan: CommercialEntitlements["plan"],
  language: CommercialUiLanguage
): string {
  return PLAN_LABELS[plan]?.[language] ?? plan;
}

export function getAccountTypeDisplayName(
  accountType: CommercialEntitlements["accountType"],
  language: CommercialUiLanguage
): string {
  return ACCOUNT_TYPE_LABELS[accountType]?.[language] ?? accountType;
}

export function getFeatureDisplayName(
  key: FeatureKey,
  language: CommercialUiLanguage
): string {
  return FEATURE_LABELS[key][language];
}

export function formatCommercialLimit(
  value: number | null,
  language: CommercialUiLanguage
): string {
  if (value === null) {
    return language === "ar" ? "غير محدود" : "Unlimited";
  }
  return String(value);
}

export function getLimitRows(
  limits: CommercialEntitlements["limits"],
  language: CommercialUiLanguage
): Array<{ key: keyof CommercialEntitlements["limits"]; label: string; value: string }> {
  return (Object.keys(LIMIT_LABELS) as Array<keyof typeof LIMIT_LABELS>).map((key) => ({
    key: key as keyof CommercialEntitlements["limits"],
    label: LIMIT_LABELS[key][language],
    value: formatCommercialLimit(limits[key], language),
  }));
}

export function splitFeaturesByAccess(features: CommercialEntitlements["features"]): {
  enabled: FeatureKey[];
  disabled: FeatureKey[];
} {
  const enabled: FeatureKey[] = [];
  const disabled: FeatureKey[] = [];

  for (const key of FEATURE_KEYS) {
    if (features[key]) {
      enabled.push(key);
    } else {
      disabled.push(key);
    }
  }

  return { enabled, disabled };
}

export function getTrialExpirationLabel(
  context: { subscription: { subscriptionStatus: string; trialEndsAt: string | null } | null },
  language: CommercialUiLanguage
): string | null {
  const sub = context.subscription;
  if (!sub || sub.subscriptionStatus !== "trial") return null;
  if (!sub.trialEndsAt) {
    return language === "ar" ? "غير محدد" : "Not set";
  }
  return sub.trialEndsAt;
}

export function isTrialAccount(entitlements: CommercialEntitlements): boolean {
  return entitlements.commercial.isTrial || entitlements.plan === "TRIAL";
}
