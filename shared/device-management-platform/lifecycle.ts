/**
 * DEVICE-MANAGEMENT-PLATFORM-ARCHITECTURE-2
 * Registration / lifecycle states — architecture only.
 */

export const DEVICE_LIFECYCLE_STATES = [
  "unregistered",
  "provisioning_requested",
  "provisioned",
  "registered",
  "verified",
  "active",
  "suspended",
  "retired",
] as const;

export type DeviceLifecycleStateId = (typeof DEVICE_LIFECYCLE_STATES)[number];

export type DeviceLifecycleStateArchitecture = {
  id: DeviceLifecycleStateId;
  title: string;
  notes: string;
};

export const DEVICE_LIFECYCLE_ARCHITECTURE: readonly DeviceLifecycleStateArchitecture[] =
  [
    { id: "unregistered", title: "Unregistered", notes: "Unknown / not enrolled." },
    { id: "provisioning_requested", title: "Provisioning Requested", notes: "Enrollment requested." },
    { id: "provisioned", title: "Provisioned", notes: "Credentials issued — future." },
    { id: "registered", title: "Registered", notes: "Device record established." },
    { id: "verified", title: "Verified", notes: "Trust verification complete." },
    { id: "active", title: "Active", notes: "Operational." },
    { id: "suspended", title: "Suspended", notes: "Temporarily disabled." },
    { id: "retired", title: "Retired", notes: "End of life." },
  ] as const;

export const DEVICE_REGISTRATION_SUPPORTS_RE_REGISTRATION = true as const;
