export const DEVICE_ROLE_OPTIONS = [
  { id: "kitchen_display", en: "Kitchen Display", ar: "شاشة المطبخ" },
  { id: "expo_display", en: "Expo Display", ar: "شاشة التجهيز" },
  { id: "pickup_display", en: "Pickup Display", ar: "شاشة الاستلام" },
  { id: "customer_display", en: "Customer Display", ar: "شاشة العملاء" },
  { id: "print_monitor", en: "Print Monitor", ar: "مراقب الطباعة" },
  { id: "self_ordering_kiosk", en: "Self Ordering Kiosk", ar: "كiosk الطلب الذاتي" },
  { id: "waiter_display", en: "Waiter Screen", ar: "شاشة النادل" },
] as const;

export function deviceRoleLabel(role: string, language: string): string {
  const isAr = language === "ar";
  const match = DEVICE_ROLE_OPTIONS.find((option) => option.id === role);
  if (!match) return role;
  return isAr ? match.ar : match.en;
}

export function presenceLabel(presence: string, language: string): string {
  const isAr = language === "ar";
  switch (presence) {
    case "online":
      return isAr ? "متصل" : "Online";
    case "offline":
      return isAr ? "غير متصل" : "Offline";
    default:
      return isAr ? "لم يتصل بعد" : "Never seen";
  }
}

export function formatDeviceAuthHeader(input: {
  deviceId: string;
  tokenId: string;
  secret: string;
}): string {
  return `Device ${input.deviceId}:${input.tokenId}:${input.secret}`;
}
