export const OPERATIONAL_DEVICE_ROLES = [
  "kitchen_display",
  "expo_display",
  "pickup_display",
  "customer_display",
  "print_monitor",
  "self_ordering_kiosk",
] as const;

export type OperationalDeviceRole = (typeof OPERATIONAL_DEVICE_ROLES)[number];

export type OperationalDeviceStatus = "active" | "disabled";

export type OperationalDeviceTokenStatus = "active" | "revoked" | "rotated";

export const DEVICE_OFFLINE_THRESHOLD_MS = 120_000;

export const DEVICE_ROLE_LABELS: Record<
  OperationalDeviceRole,
  { en: string; ar: string }
> = {
  kitchen_display: { en: "Kitchen Display", ar: "شاشة المطبخ" },
  expo_display: { en: "Expo Display", ar: "شاشة التجهيز" },
  pickup_display: { en: "Pickup Display", ar: "شاشة الاستلام" },
  customer_display: { en: "Customer Display", ar: "شاشة العملاء" },
  print_monitor: { en: "Print Monitor", ar: "مراقب الطباعة" },
  self_ordering_kiosk: { en: "Self Ordering Kiosk", ar: "كiosk الطلب الذاتي" },
};

export const KITCHEN_QUEUE_ROLES: OperationalDeviceRole[] = [
  "kitchen_display",
  "expo_display",
];

export const PRINT_MONITOR_ROLES: OperationalDeviceRole[] = ["print_monitor"];

export function assertDeviceRole(value: string): OperationalDeviceRole {
  if (!(OPERATIONAL_DEVICE_ROLES as readonly string[]).includes(value)) {
    throw new Error(`invalid_device_role:${value}`);
  }
  return value as OperationalDeviceRole;
}

export function rolePermitsKitchenQueue(role: OperationalDeviceRole): boolean {
  return KITCHEN_QUEUE_ROLES.includes(role);
}

export function rolePermitsPrintMonitor(role: OperationalDeviceRole): boolean {
  return PRINT_MONITOR_ROLES.includes(role);
}
