/**
 * DEVICE-MANAGEMENT-PLATFORM-ARCHITECTURE-2
 * Device configuration ownership — metadata architecture only.
 */

export const DEVICE_CONFIGURATION_KEYS = [
  "theme",
  "language",
  "timezone",
  "refresh_interval",
  "realtime_mode",
  "capabilities",
  "printer_mapping",
  "screen_settings",
  "feature_flags",
] as const;

export type DeviceConfigurationKeyId =
  (typeof DEVICE_CONFIGURATION_KEYS)[number];

export type DeviceConfigurationArchitecture = {
  id: DeviceConfigurationKeyId;
  title: string;
  ownership: "Device Management Platform";
  notes: string;
};

export const DEVICE_CONFIGURATION_ARCHITECTURE: readonly DeviceConfigurationArchitecture[] =
  [
    { id: "theme", title: "Theme", ownership: "Device Management Platform", notes: "Presentation theme metadata." },
    { id: "language", title: "Language", ownership: "Device Management Platform", notes: "Locale preference." },
    { id: "timezone", title: "Timezone", ownership: "Device Management Platform", notes: "Device local timezone." },
    { id: "refresh_interval", title: "Refresh Interval", ownership: "Device Management Platform", notes: "UI refresh cadence." },
    { id: "realtime_mode", title: "Realtime Mode", ownership: "Device Management Platform", notes: "How device consumes Realtime — does not own transport." },
    { id: "capabilities", title: "Capabilities", ownership: "Device Management Platform", notes: "Enabled capability flags." },
    { id: "printer_mapping", title: "Printer Mapping", ownership: "Device Management Platform", notes: "Printer target mapping metadata." },
    { id: "screen_settings", title: "Screen Settings", ownership: "Device Management Platform", notes: "Display layout settings." },
    { id: "feature_flags", title: "Feature Flags", ownership: "Device Management Platform", notes: "Device-scoped feature flags." },
  ] as const;
