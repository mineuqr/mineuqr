/** Product-facing Screen Management labels (Operational Device remains technical entity). */

export const SCREEN_TYPE_OPTIONS = [
  { id: "kitchen_display", en: "Kitchen Screen", ar: "شاشة المطبخ" },
  { id: "expo_display", en: "Expo Screen", ar: "شاشة التجهيز" },
  { id: "pickup_display", en: "Pickup Screen", ar: "شاشة الاستلام" },
  { id: "customer_display", en: "Display Screen", ar: "شاشة العرض" },
  { id: "print_monitor", en: "Print Monitor", ar: "مراقب الطباعة" },
  { id: "self_ordering_kiosk", en: "Self-Order Screen", ar: "شاشة الطلب الذاتي" },
] as const;

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
