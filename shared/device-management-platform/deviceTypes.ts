/**
 * DEVICE-MANAGEMENT-PLATFORM-ARCHITECTURE-2
 * Supported device types — architecture catalog.
 */

export const DEVICE_TYPES = [
  "kitchen_display",
  "expo_display",
  "pickup_display",
  "customer_display",
  "self_ordering_kiosk",
  "waiter_device",
  "register_terminal",
  "printer",
  "kitchen_printer",
  "receipt_printer",
  "label_printer",
  "future_pos",
  "future_mobile_app",
  "future_customer_app",
] as const;

export type DeviceTypeId = (typeof DEVICE_TYPES)[number];

export type DeviceTypeArchitecture = {
  id: DeviceTypeId;
  title: string;
  category: "display" | "ordering" | "register" | "printer" | "future";
  maturity: "architecture" | "reserved";
};

export const DEVICE_TYPE_ARCHITECTURE: readonly DeviceTypeArchitecture[] = [
  { id: "kitchen_display", title: "Kitchen Display", category: "display", maturity: "architecture" },
  { id: "expo_display", title: "Expo Display", category: "display", maturity: "architecture" },
  { id: "pickup_display", title: "Pickup Display", category: "display", maturity: "architecture" },
  { id: "customer_display", title: "Customer Display", category: "display", maturity: "architecture" },
  { id: "self_ordering_kiosk", title: "Self Ordering Kiosk", category: "ordering", maturity: "architecture" },
  { id: "waiter_device", title: "Waiter Device", category: "ordering", maturity: "architecture" },
  { id: "register_terminal", title: "Register Terminal", category: "register", maturity: "architecture" },
  { id: "printer", title: "Printer", category: "printer", maturity: "architecture" },
  { id: "kitchen_printer", title: "Kitchen Printer", category: "printer", maturity: "architecture" },
  { id: "receipt_printer", title: "Receipt Printer", category: "printer", maturity: "architecture" },
  { id: "label_printer", title: "Label Printer", category: "printer", maturity: "architecture" },
  { id: "future_pos", title: "Future POS", category: "future", maturity: "reserved" },
  { id: "future_mobile_app", title: "Future Mobile App", category: "future", maturity: "reserved" },
  { id: "future_customer_app", title: "Future Customer App", category: "future", maturity: "reserved" },
] as const;
