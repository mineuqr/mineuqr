/**
 * DEVICE-MANAGEMENT-PLATFORM-ARCHITECTURE-2
 * Canonical device identity fields — architecture only.
 */

export const DEVICE_IDENTITY_FIELDS = [
  "deviceId",
  "tenant",
  "restaurant",
  "location",
  "screenType",
  "deviceType",
  "displayName",
  "provisioningKey",
  "registrationDate",
  "lastSeen",
  "status",
  "version",
  "capabilities",
  "tags",
] as const;

export type DeviceIdentityFieldId = (typeof DEVICE_IDENTITY_FIELDS)[number];

export type DeviceIdentityFieldArchitecture = {
  id: DeviceIdentityFieldId;
  title: string;
  notes: string;
};

export const DEVICE_IDENTITY_ARCHITECTURE: readonly DeviceIdentityFieldArchitecture[] =
  [
    { id: "deviceId", title: "Device ID", notes: "Stable operational identifier." },
    { id: "tenant", title: "Tenant", notes: "Tenant scope — operational metadata only." },
    { id: "restaurant", title: "Restaurant", notes: "Restaurant assignment scope." },
    { id: "location", title: "Location", notes: "Physical / logical location label." },
    { id: "screenType", title: "Screen Type", notes: "Operational screen classification." },
    { id: "deviceType", title: "Device Type", notes: "From DEVICE_TYPE_ARCHITECTURE." },
    { id: "displayName", title: "Display Name", notes: "Operator-facing label." },
    { id: "provisioningKey", title: "Provisioning Key", notes: "Enrollment metadata — not implemented." },
    { id: "registrationDate", title: "Registration Date", notes: "First registration timestamp." },
    { id: "lastSeen", title: "Last Seen", notes: "Connectivity signal." },
    { id: "status", title: "Status", notes: "Lifecycle / health status." },
    { id: "version", title: "Version", notes: "Client / firmware version tracking." },
    { id: "capabilities", title: "Capabilities", notes: "Feature capability flags." },
    { id: "tags", title: "Tags", notes: "Inventory grouping tags." },
  ] as const;
