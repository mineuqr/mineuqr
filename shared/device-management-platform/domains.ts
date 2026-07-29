/**
 * DEVICE-MANAGEMENT-PLATFORM-ARCHITECTURE-2
 * Domain ownership — architecture SSOT only (no provisioning / runtime).
 */

export const DEVICE_MANAGEMENT_PLATFORM_PROGRAM =
  "DEVICE-MANAGEMENT-PLATFORM-ARCHITECTURE-2" as const;

export const DEVICE_PLATFORM_DOMAINS = [
  "device_identity",
  "device_registration",
  "device_provisioning",
  "device_assignment",
  "device_connectivity",
  "device_health",
  "device_configuration",
  "device_inventory",
  "device_lifecycle",
  "device_diagnostics",
  "device_security",
  "device_updates",
] as const;

export type DevicePlatformDomainId = (typeof DEVICE_PLATFORM_DOMAINS)[number];

export type DevicePlatformDomainMaturity =
  | "architecture"
  | "ssot_consumer"
  | "reserved"
  | "deferred";

export type DevicePlatformDomainDefinition = {
  id: DevicePlatformDomainId;
  title: string;
  ownership: string;
  maturity: DevicePlatformDomainMaturity;
  notes: string;
};

export const DEVICE_PLATFORM_DOMAIN_DEFINITIONS: readonly DevicePlatformDomainDefinition[] =
  [
    {
      id: "device_identity",
      title: "Device Identity",
      ownership: "Device Management Platform",
      maturity: "architecture",
      notes: "Canonical identity fields — architecture catalog only.",
    },
    {
      id: "device_registration",
      title: "Device Registration",
      ownership: "Device Management Platform",
      maturity: "architecture",
      notes: "Lifecycle states including re-registration — not implemented here.",
    },
    {
      id: "device_provisioning",
      title: "Device Provisioning",
      ownership: "Device Management Platform (reserved)",
      maturity: "reserved",
      notes: "Codes, QR, OTP, pairing, remote approval — future only.",
    },
    {
      id: "device_assignment",
      title: "Device Assignment",
      ownership: "Device Management Platform",
      maturity: "architecture",
      notes: "Restaurant / kitchen / station / zone assignment — no business entity ownership.",
    },
    {
      id: "device_connectivity",
      title: "Device Connectivity",
      ownership: "Device Management Platform (consumes Realtime connectivity signals)",
      maturity: "ssot_consumer",
      notes: "Online / last seen / heartbeat — no parallel Realtime collectors.",
    },
    {
      id: "device_health",
      title: "Device Health",
      ownership: "Device Management Platform",
      maturity: "architecture",
      notes: "Threshold-driven health model — evaluation deferred.",
    },
    {
      id: "device_configuration",
      title: "Device Configuration",
      ownership: "Device Management Platform",
      maturity: "architecture",
      notes: "Theme, language, realtime mode, printer mapping metadata.",
    },
    {
      id: "device_inventory",
      title: "Device Inventory",
      ownership: "Device Management Platform",
      maturity: "architecture",
      notes: "Search / filter / grouping architecture.",
    },
    {
      id: "device_lifecycle",
      title: "Device Lifecycle",
      ownership: "Device Management Platform",
      maturity: "architecture",
      notes: "Unregistered → … → Retired — architecture only.",
    },
    {
      id: "device_diagnostics",
      title: "Device Diagnostics",
      ownership: "Device Management Platform",
      maturity: "architecture",
      notes: "Read-only diagnostics — no runtime mutation.",
    },
    {
      id: "device_security",
      title: "Device Security",
      ownership: "Device Management Platform",
      maturity: "architecture",
      notes: "Provisioning tokens / trust / revocation ownership — no auth redesign.",
    },
    {
      id: "device_updates",
      title: "Device Updates",
      ownership: "Device Management Platform (reserved)",
      maturity: "reserved",
      notes: "Version tracking / rollback — future only.",
    },
  ] as const;

