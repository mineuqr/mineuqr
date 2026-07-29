/**
 * DEVICE-MANAGEMENT-PLATFORM-ARCHITECTURE-2
 * Data ownership boundaries.
 */

export const DEVICE_PLATFORM_OWNS = [
  "device_metadata",
  "provisioning_metadata",
  "assignment_metadata",
  "connectivity_metadata",
  "inventory",
  "health",
  "diagnostics",
  "configuration_metadata",
] as const;

export const DEVICE_PLATFORM_DOES_NOT_OWN = [
  "orders",
  "sessions",
  "checks",
  "menus",
  "reporting",
  "realtime_transport",
  "authentication",
  "business_data",
  "business_payloads",
  "realtime_messages",
] as const;

export const DEVICE_ARCHITECTURE_PRINCIPLES = [
  "operational_device_lifecycle_ssot",
  "never_owns_business_entities",
  "no_duplicate_collectors",
  "consume_realtime_connectivity_ssot",
  "no_authentication_redesign",
  "read_only_diagnostics",
  "no_provisioning_implementation",
  "platform_ops_ui_reuse",
] as const;

export type DevicePlatformOwns = (typeof DEVICE_PLATFORM_OWNS)[number];
export type DevicePlatformDoesNotOwn =
  (typeof DEVICE_PLATFORM_DOES_NOT_OWN)[number];
