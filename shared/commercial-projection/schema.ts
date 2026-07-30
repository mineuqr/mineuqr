/**
 * COMMERCIAL-PROJECTION-GENERATION-1 — Projection schema.
 */

import type { DiscoveryCapabilityId } from "../capability-discovery/commercialEligible";

export const COMMERCIAL_PROJECTION_VERSION = "1.0.0" as const;

export const COMMERCIAL_PROJECTION_IDS = [
  "ordering",
  "checkManagement",
  "splitPayment",
  "multiCheckAllocation",
  "refund",
  "register",
  "reporting",
  "kitchen",
  "printing",
  "realtime",
  "devices",
  "waiter",
  "kiosk",
  "counterPickup",
  "expo",
] as const;

export type CommercialProjectionId =
  (typeof COMMERCIAL_PROJECTION_IDS)[number];

export type CommercialProjectionVisibility = "plan" | "internal_compat";
export type CommercialProjectionLifecycle =
  | "active"
  | "compat_only"
  | "deprecated";

export type CommercialProjectionRecord = {
  /** Stable Plan / Catalog / Offering / Runtime projection identifier */
  projectionId: CommercialProjectionId;
  capabilityName: string;
  owner: string;
  domain: string;
  category: string;
  commercialEligibility: "COMMERCIAL_ELIGIBLE";
  visibility: "plan";
  lifecycle: "active";
  /** Discovery CAP IDs this projection is generated from */
  discoveryCapabilityIds: readonly DiscoveryCapabilityId[];
  dependencies: readonly CommercialProjectionId[];
  planAvailability: true;
  publicVisibility: true;
  defaultState: boolean;
  runtimeCapabilityId: string;
  projectionVersion: typeof COMMERCIAL_PROJECTION_VERSION;
};

export function isCommercialProjectionId(
  key: string
): key is CommercialProjectionId {
  return (COMMERCIAL_PROJECTION_IDS as readonly string[]).includes(key);
}
