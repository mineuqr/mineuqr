/** Product-facing Screen Management labels (Operational Device remains technical entity). */

/**
 * Full architectural catalog — includes hidden roadmap types.
 * OPERATIONAL-SCREEN-CATALOG-POLICY-1 — do not delete hidden entries.
 */
export const SCREEN_TYPE_OPTIONS = [
  { id: "kitchen_display", en: "Kitchen Display", ar: "شاشة المطبخ" },
  { id: "expo_display", en: "Expo Screen", ar: "شاشة التجهيز" },
  { id: "pickup_display", en: "Pickup Screen", ar: "شاشة الاستلام" },
  { id: "customer_display", en: "Display Screen", ar: "شاشة العرض" },
  { id: "print_monitor", en: "Print Monitor", ar: "مراقب الطباعة" },
  { id: "self_ordering_kiosk", en: "Self Ordering Kiosk", ar: "كiosk الطلب الذاتي" },
  { id: "waiter_display", en: "Waiter Screen", ar: "شاشة النادل" },
] as const;

/** OPERATIONAL-SCREEN-CATALOG-POLICY-1 — provisioning / create selector only. */
export const PROVISIONING_VISIBLE_SCREEN_TYPE_IDS = [
  "kitchen_display",
  "waiter_display",
  "self_ordering_kiosk",
] as const;

export type ProvisioningVisibleScreenTypeId =
  (typeof PROVISIONING_VISIBLE_SCREEN_TYPE_IDS)[number];

export const PROVISIONING_VISIBLE_SCREEN_TYPE_OPTIONS =
  SCREEN_TYPE_OPTIONS.filter((option) =>
    (PROVISIONING_VISIBLE_SCREEN_TYPE_IDS as readonly string[]).includes(
      option.id
    )
  );

export const DISPLAY_DENSITY_OPTIONS = [
  { id: "large", en: "Large", ar: "كبير", program: "KITCHEN-DISPLAY-DENSITY-1" },
  { id: "comfortable", en: "Comfortable", ar: "مريح", program: "KITCHEN-DISPLAY-DENSITY-1" },
  { id: "compact", en: "Compact", ar: "مضغوط", program: "KITCHEN-DISPLAY-DENSITY-1" },
] as const;

export function screenTypeLabel(role: string, language: string): string {
  const isAr = language === "ar";
  const match = SCREEN_TYPE_OPTIONS.find((option) => option.id === role);
  if (!match) return role;
  return isAr ? match.ar : match.en;
}

export function screenStatusLabel(status: string, language: string): string {
  const isAr = language === "ar";
  if (status === "active") return isAr ? "نشط" : "Active";
  if (status === "disabled") return isAr ? "معطل" : "Disabled";
  return status;
}

export function presenceLabel(presence: string, language: string): string {
  const isAr = language === "ar";
  switch (presence) {
    case "online":
      return isAr ? "متصل" : "Online";
    case "offline":
      return isAr ? "غير متصل" : "Offline";
    default:
      return isAr ? "لم يتصل بعد" : "Never connected";
  }
}

export function densityLabel(density: string, language: string): string {
  const isAr = language === "ar";
  const match = DISPLAY_DENSITY_OPTIONS.find((option) => option.id === density);
  if (!match) return density;
  return isAr ? match.ar : match.en;
}
