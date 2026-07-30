/**
 * CAPABILITY-DISCOVERY-PLATFORM-RECONSTRUCTION-1
 * COMMERCIAL-PROJECTION-GENERATION-1
 *
 * Machine-readable Commercial ELIGIBLE Discovery capabilities.
 * Source: Canonical Discovery (reconstruction). Not a redesign of Discovery docs.
 * Projection MUST only include rows derived from this set.
 */

export type DiscoveryCapabilityId =
  | "CAP-03"
  | "CAP-08"
  | "CAP-10"
  | "CAP-11"
  | "CAP-13"
  | "CAP-16"
  | "CAP-17"
  | "CAP-22"
  | "CAP-26"
  | "CAP-27"
  | "CAP-28"
  | "CAP-29"
  | "CAP-30"
  | "CAP-31"
  | "CAP-32"
  | "CAP-33"
  | "CAP-47";

export type DiscoveryEligibleCapability = {
  capabilityId: DiscoveryCapabilityId;
  name: string;
  domain: string;
  owner: string;
  commercialEligibility: "COMMERCIAL_ELIGIBLE";
};

/** Exactly the reconstruction ELIGIBLE set (17). */
export const DISCOVERY_COMMERCIAL_ELIGIBLE: readonly DiscoveryEligibleCapability[] =
  [
    { capabilityId: "CAP-03", name: "Ordering Platform", domain: "QR Ordering", owner: "Ordering Platform", commercialEligibility: "COMMERCIAL_ELIGIBLE" },
    { capabilityId: "CAP-08", name: "Check Management", domain: "Check Management", owner: "Settlement Platform", commercialEligibility: "COMMERCIAL_ELIGIBLE" },
    { capabilityId: "CAP-10", name: "Split Payment", domain: "Settlement", owner: "Settlement Platform", commercialEligibility: "COMMERCIAL_ELIGIBLE" },
    { capabilityId: "CAP-11", name: "Multi-Check Allocation", domain: "Settlement", owner: "Settlement Platform", commercialEligibility: "COMMERCIAL_ELIGIBLE" },
    { capabilityId: "CAP-13", name: "Refund Platform", domain: "Settlement", owner: "Settlement Platform", commercialEligibility: "COMMERCIAL_ELIGIBLE" },
    { capabilityId: "CAP-16", name: "CRMP Register", domain: "Register", owner: "Register Platform", commercialEligibility: "COMMERCIAL_ELIGIBLE" },
    { capabilityId: "CAP-17", name: "Financial Shift Lifecycle", domain: "Register", owner: "Register Platform", commercialEligibility: "COMMERCIAL_ELIGIBLE" },
    { capabilityId: "CAP-22", name: "Reporting Platform", domain: "Reporting", owner: "Reporting Platform", commercialEligibility: "COMMERCIAL_ELIGIBLE" },
    { capabilityId: "CAP-26", name: "Kitchen Display", domain: "Kitchen", owner: "Kitchen Platform", commercialEligibility: "COMMERCIAL_ELIGIBLE" },
    { capabilityId: "CAP-27", name: "Printing Platform", domain: "Printing", owner: "Printing Platform", commercialEligibility: "COMMERCIAL_ELIGIBLE" },
    { capabilityId: "CAP-28", name: "Realtime Platform", domain: "Realtime", owner: "Realtime Platform", commercialEligibility: "COMMERCIAL_ELIGIBLE" },
    { capabilityId: "CAP-29", name: "Device Management", domain: "Device Management", owner: "Device Platform", commercialEligibility: "COMMERCIAL_ELIGIBLE" },
    { capabilityId: "CAP-30", name: "Screen Management", domain: "Screen Management", owner: "Device / Screen Ops", commercialEligibility: "COMMERCIAL_ELIGIBLE" },
    { capabilityId: "CAP-31", name: "Waiter Ordering", domain: "Waiter", owner: "Waiter Platform", commercialEligibility: "COMMERCIAL_ELIGIBLE" },
    { capabilityId: "CAP-32", name: "Self-Ordering Kiosk", domain: "Self Ordering Kiosk", owner: "Ordering Client / Kiosk", commercialEligibility: "COMMERCIAL_ELIGIBLE" },
    { capabilityId: "CAP-33", name: "Counter Pickup Settlement", domain: "Pickup", owner: "Order Platform", commercialEligibility: "COMMERCIAL_ELIGIBLE" },
    { capabilityId: "CAP-47", name: "Expo Display Workspace", domain: "Expo", owner: "Expo / Operational Screen", commercialEligibility: "COMMERCIAL_ELIGIBLE" },
  ] as const;

export const DISCOVERY_COMMERCIAL_ELIGIBLE_IDS: readonly DiscoveryCapabilityId[] =
  DISCOVERY_COMMERCIAL_ELIGIBLE.map((c) => c.capabilityId);

export function isDiscoveryCommercialEligibleId(
  id: string
): id is DiscoveryCapabilityId {
  return (DISCOVERY_COMMERCIAL_ELIGIBLE_IDS as readonly string[]).includes(id);
}
