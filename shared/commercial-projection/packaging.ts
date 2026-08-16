/**
 * COMMERCIAL-PROJECTION-GENERATION-1
 * Packaging policy: Discovery ELIGIBLE → Commercial Projection records.
 * Bundles CAP-16+17 → register; CAP-29+30 → devices. All others 1:1.
 */

import {
  DISCOVERY_COMMERCIAL_ELIGIBLE,
  type DiscoveryCapabilityId,
  type DiscoveryEligibleCapability,
} from "../capability-discovery/commercialEligible";
import {
  COMMERCIAL_PROJECTION_VERSION,
  type CommercialProjectionId,
  type CommercialProjectionRecord,
} from "./schema";

type PackagingRule = {
  projectionId: CommercialProjectionId;
  origin?: "discovery" | "catalog_promoted";
  discoveryCapabilityIds: readonly string[];
  capabilityName: string;
  category: string;
  runtimeCapabilityId: string;
  owner?: string;
  domain?: string;
  dependencies?: readonly CommercialProjectionId[];
  defaultState?: boolean;
};

/**
 * Normative packaging rules. Projection IDs are generated from these rules
 * applied to Discovery ELIGIBLE — not from FEATURE_KEYS.
 */
const PACKAGING_RULES: readonly PackagingRule[] = [
  {
    projectionId: "ordering",
    discoveryCapabilityIds: ["CAP-03"],
    capabilityName: "Ordering Platform",
    category: "ordering",
    runtimeCapabilityId: "cap.ordering.core",
    defaultState: false,
  },
  {
    projectionId: "checkManagement",
    discoveryCapabilityIds: ["CAP-08"],
    capabilityName: "Check Management",
    category: "settlement",
    runtimeCapabilityId: "cap.settlement.check",
    dependencies: ["ordering"],
  },
  {
    projectionId: "splitPayment",
    discoveryCapabilityIds: ["CAP-10"],
    capabilityName: "Split Payment",
    category: "settlement",
    runtimeCapabilityId: "cap.settlement.splitPayment",
    dependencies: ["checkManagement"],
  },
  {
    projectionId: "multiCheckAllocation",
    discoveryCapabilityIds: ["CAP-11"],
    capabilityName: "Multi-Check Allocation",
    category: "settlement",
    runtimeCapabilityId: "cap.settlement.multiCheckAllocation",
    dependencies: ["checkManagement"],
  },
  {
    projectionId: "refund",
    discoveryCapabilityIds: ["CAP-13"],
    capabilityName: "Refund Platform",
    category: "settlement",
    runtimeCapabilityId: "cap.settlement.refund",
    dependencies: ["checkManagement"],
  },
  {
    projectionId: "register",
    discoveryCapabilityIds: ["CAP-16", "CAP-17"],
    capabilityName: "Register Operations",
    category: "register",
    runtimeCapabilityId: "cap.register.crmp",
  },
  {
    projectionId: "reporting",
    discoveryCapabilityIds: ["CAP-22"],
    capabilityName: "Reporting Platform",
    category: "reporting",
    runtimeCapabilityId: "cap.reporting.platform",
  },
  {
    projectionId: "kitchen",
    discoveryCapabilityIds: ["CAP-26"],
    capabilityName: "Kitchen Display",
    category: "ops_display",
    runtimeCapabilityId: "cap.kitchen.display",
    dependencies: ["ordering"],
  },
  {
    projectionId: "printing",
    discoveryCapabilityIds: ["CAP-27"],
    capabilityName: "Printing Platform",
    category: "printing",
    runtimeCapabilityId: "cap.printing.platform",
    dependencies: ["ordering"],
  },
  {
    projectionId: "realtime",
    discoveryCapabilityIds: ["CAP-28"],
    capabilityName: "Realtime Platform",
    category: "infrastructure",
    runtimeCapabilityId: "cap.realtime.platform",
  },
  {
    projectionId: "devices",
    discoveryCapabilityIds: ["CAP-29", "CAP-30"],
    capabilityName: "Device & Screen Management",
    category: "devices",
    runtimeCapabilityId: "cap.device.management",
  },
  {
    projectionId: "waiter",
    discoveryCapabilityIds: ["CAP-31"],
    capabilityName: "Waiter Ordering",
    category: "ordering",
    runtimeCapabilityId: "cap.ordering.waiter",
    dependencies: ["ordering"],
  },
  {
    projectionId: "kiosk",
    discoveryCapabilityIds: ["CAP-32"],
    capabilityName: "Self-Ordering Kiosk",
    category: "ordering",
    runtimeCapabilityId: "cap.ordering.kiosk",
    dependencies: ["ordering"],
  },
  {
    projectionId: "counterPickup",
    discoveryCapabilityIds: ["CAP-33"],
    capabilityName: "Counter Pickup Settlement",
    category: "ordering",
    runtimeCapabilityId: "cap.ordering.counterPickup",
    dependencies: ["ordering"],
  },
  {
    projectionId: "expo",
    discoveryCapabilityIds: ["CAP-47"],
    capabilityName: "Expo Display Workspace",
    category: "ops_display",
    runtimeCapabilityId: "cap.expo.display",
    dependencies: ["kitchen", "devices"],
  },
  {
    projectionId: "sessionTableManagement",
    origin: "catalog_promoted",
    discoveryCapabilityIds: ["CAP-06", "CAP-07"],
    capabilityName: "Session Management",
    category: "sessions",
    runtimeCapabilityId: "cap.session.management",
    owner: "Session Platform",
    domain: "sessions",
    defaultState: true,
  },
  {
    projectionId: "menuManagement",
    origin: "catalog_promoted",
    discoveryCapabilityIds: ["CAP-05"],
    capabilityName: "Menu & Item Management",
    category: "menu",
    runtimeCapabilityId: "cap.menu.management",
    owner: "Menu Platform",
    domain: "menu",
    defaultState: true,
  },
  {
    projectionId: "menuDesign",
    origin: "catalog_promoted",
    discoveryCapabilityIds: ["CAP-05"],
    capabilityName: "Menu Design",
    category: "design",
    runtimeCapabilityId: "cap.menu.design",
    owner: "Menu Design",
    domain: "design",
    defaultState: true,
  },
  {
    projectionId: "smartQr",
    origin: "catalog_promoted",
    discoveryCapabilityIds: ["CAP-06"],
    capabilityName: "QR Codes",
    category: "qr",
    runtimeCapabilityId: "cap.qr.smart",
    owner: "QR Platform",
    domain: "qr",
    defaultState: true,
  },
] as const;

function eligibleById(): Map<DiscoveryCapabilityId, DiscoveryEligibleCapability> {
  return new Map(DISCOVERY_COMMERCIAL_ELIGIBLE.map((c) => [c.capabilityId, c]));
}

/**
 * Generate Commercial Projection registry from Discovery ELIGIBLE + packaging policy.
 * Throws if a rule references a non-eligible Discovery ID (orphan / invalid).
 */
export function generateCommercialProjectionRegistry(
  rules: readonly PackagingRule[] = PACKAGING_RULES
): readonly CommercialProjectionRecord[] {
  const eligible = eligibleById();
  const used = new Set<DiscoveryCapabilityId>();
  const out: CommercialProjectionRecord[] = [];

  for (const rule of rules) {
    const origin = rule.origin ?? "discovery";
    if (origin === "catalog_promoted") {
      if (!rule.owner || !rule.domain) {
        throw new Error(
          `COMMERCIAL-PROJECTION: catalog-promoted ${rule.projectionId} requires owner and domain`
        );
      }
      out.push({
        projectionId: rule.projectionId,
        capabilityName: rule.capabilityName,
        owner: rule.owner,
        domain: rule.domain,
        category: rule.category,
        commercialEligibility: "COMMERCIAL_ELIGIBLE",
        visibility: "plan",
        lifecycle: "active",
        discoveryCapabilityIds: rule.discoveryCapabilityIds,
        origin: "catalog_promoted",
        dependencies: rule.dependencies ?? [],
        planAvailability: true,
        publicVisibility: true,
        defaultState: rule.defaultState ?? true,
        runtimeCapabilityId: rule.runtimeCapabilityId,
        projectionVersion: COMMERCIAL_PROJECTION_VERSION,
      });
      continue;
    }
    for (const id of rule.discoveryCapabilityIds) {
      if (!eligible.has(id as DiscoveryCapabilityId)) {
        throw new Error(
          `COMMERCIAL-PROJECTION: packaging references non-eligible ${id} for ${rule.projectionId}`
        );
      }
      used.add(id as DiscoveryCapabilityId);
    }
    const primary = eligible.get(rule.discoveryCapabilityIds[0] as DiscoveryCapabilityId)!;
    out.push({
      projectionId: rule.projectionId,
      capabilityName: rule.capabilityName,
      owner: primary.owner,
      domain: primary.domain,
      category: rule.category,
      commercialEligibility: "COMMERCIAL_ELIGIBLE",
      visibility: "plan",
      lifecycle: "active",
      discoveryCapabilityIds: rule.discoveryCapabilityIds,
      origin: "discovery",
      dependencies: rule.dependencies ?? [],
      planAvailability: true,
      publicVisibility: true,
      defaultState: rule.defaultState ?? false,
      runtimeCapabilityId: rule.runtimeCapabilityId,
      projectionVersion: COMMERCIAL_PROJECTION_VERSION,
    });
  }

  for (const cap of DISCOVERY_COMMERCIAL_ELIGIBLE) {
    if (!used.has(cap.capabilityId)) {
      throw new Error(
        `COMMERCIAL-PROJECTION: eligible ${cap.capabilityId} has no packaging rule (orphan Discovery)`
      );
    }
  }

  return out;
}

export const COMMERCIAL_PROJECTION_PACKAGING_RULES = PACKAGING_RULES;
