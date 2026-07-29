/**
 * DEVICE-MANAGEMENT-PLATFORM-ARCHITECTURE-2
 * Provisioning — reserved; Updates — reserved.
 */

export const DEVICE_PROVISIONING_CAPABILITIES = [
  "provisioning_codes",
  "qr_provisioning",
  "one_time_tokens",
  "pairing",
  "remote_approval",
  "secure_enrollment",
] as const;

export type DeviceProvisioningCapabilityId =
  (typeof DEVICE_PROVISIONING_CAPABILITIES)[number];

export type DeviceProvisioningArchitecture = {
  id: DeviceProvisioningCapabilityId;
  title: string;
  maturity: "reserved";
  notes: string;
};

export const DEVICE_PROVISIONING_ARCHITECTURE: readonly DeviceProvisioningArchitecture[] =
  [
    { id: "provisioning_codes", title: "Provisioning Codes", maturity: "reserved", notes: "Future implementation only." },
    { id: "qr_provisioning", title: "QR Provisioning", maturity: "reserved", notes: "Future implementation only." },
    { id: "one_time_tokens", title: "One-Time Tokens", maturity: "reserved", notes: "Future implementation only." },
    { id: "pairing", title: "Pairing", maturity: "reserved", notes: "Future implementation only." },
    { id: "remote_approval", title: "Remote Approval", maturity: "reserved", notes: "Future implementation only." },
    { id: "secure_enrollment", title: "Secure Enrollment", maturity: "reserved", notes: "Future implementation only." },
  ] as const;

export const DEVICE_UPDATE_STATES = [
  "version_tracking",
  "pending_update",
  "updating",
  "update_failed",
  "rollback",
] as const;

export type DeviceUpdateStateId = (typeof DEVICE_UPDATE_STATES)[number];

export type DeviceUpdateArchitecture = {
  id: DeviceUpdateStateId;
  title: string;
  maturity: "reserved";
};

export const DEVICE_UPDATE_ARCHITECTURE: readonly DeviceUpdateArchitecture[] = [
  { id: "version_tracking", title: "Version Tracking", maturity: "reserved" },
  { id: "pending_update", title: "Pending Update", maturity: "reserved" },
  { id: "updating", title: "Updating", maturity: "reserved" },
  { id: "update_failed", title: "Update Failed", maturity: "reserved" },
  { id: "rollback", title: "Rollback", maturity: "reserved" },
] as const;
