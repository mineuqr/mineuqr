/**
 * COMMERCIAL-CAPABILITY-EXPERIENCE-1 + COMMERCIAL-PROJECTION-GENERATION-1
 * Presentation helpers — Commercial Projection filters as UX objects.
 */

import {
  COMMERCIAL_CAPABILITY_FILTER_REGISTRY,
  type CommercialCapabilityFilterKey,
  type CommercialCapabilityFilterRow,
} from "@shared/commercial-capability";

/** Experience domain ids for grouping (presentation map over registry category). */
export const CAPABILITY_EXPERIENCE_DOMAIN_ORDER = [
  "orders",
  "settlement",
  "register",
  "ops_display",
  "printing",
  "devices",
  "reports",
  "platform",
] as const;

export type CapabilityExperienceDomainId =
  (typeof CAPABILITY_EXPERIENCE_DOMAIN_ORDER)[number];

const CATEGORY_TO_DOMAIN: Record<string, CapabilityExperienceDomainId> = {
  ordering: "orders",
  settlement: "settlement",
  register: "register",
  ops_display: "ops_display",
  printing: "printing",
  devices: "devices",
  reporting: "reports",
  infrastructure: "platform",
};

export type CapabilityExperienceCard = CommercialCapabilityFilterRow & {
  experienceDomain: CapabilityExperienceDomainId;
};

export function experienceDomainForCategory(
  category: string
): CapabilityExperienceDomainId {
  return CATEGORY_TO_DOMAIN[category] ?? "platform";
}

/** @deprecated Prefer experienceDomainForCategory — kept for call-site stability. */
export function experienceDomainForOwner(
  ownerDomain: string
): CapabilityExperienceDomainId {
  void ownerDomain;
  return "platform";
}

export function listCapabilityExperienceCards(): CapabilityExperienceCard[] {
  return COMMERCIAL_CAPABILITY_FILTER_REGISTRY.map((row) => ({
    ...row,
    experienceDomain: experienceDomainForCategory(row.category),
  }));
}

export function groupCapabilitiesByExperienceDomain(
  cards: readonly CapabilityExperienceCard[] = listCapabilityExperienceCards()
): Array<{
  domainId: CapabilityExperienceDomainId;
  capabilities: CapabilityExperienceCard[];
}> {
  const map = new Map<
    CapabilityExperienceDomainId,
    CapabilityExperienceCard[]
  >();
  for (const id of CAPABILITY_EXPERIENCE_DOMAIN_ORDER) {
    map.set(id, []);
  }
  for (const card of cards) {
    map.get(card.experienceDomain)!.push(card);
  }
  return CAPABILITY_EXPERIENCE_DOMAIN_ORDER.map((domainId) => ({
    domainId,
    capabilities: map.get(domainId) ?? [],
  })).filter((g) => g.capabilities.length > 0);
}

export function countEnabledCapabilities(
  selected: Record<string, boolean>
): { total: number; enabled: number; disabled: number } {
  const total = COMMERCIAL_CAPABILITY_FILTER_REGISTRY.length;
  let enabled = 0;
  for (const row of COMMERCIAL_CAPABILITY_FILTER_REGISTRY) {
    if (selected[row.filterKey]) enabled += 1;
  }
  return { total, enabled, disabled: total - enabled };
}

export function isFilterKey(
  key: string
): key is CommercialCapabilityFilterKey {
  return COMMERCIAL_CAPABILITY_FILTER_REGISTRY.some((r) => r.filterKey === key);
}

/** Lifecycle stages for commercial plan version UX (foundation + overlay). */
export const CAPABILITY_PUBLISH_LIFECYCLE = [
  "draft",
  "approved",
  "published",
  "retired",
  "archived",
] as const;

export type CapabilityPublishLifecycleState =
  (typeof CAPABILITY_PUBLISH_LIFECYCLE)[number];

export function resolveLifecycleStage(input: {
  foundationState: string;
  workflowState?: string | null;
}): CapabilityPublishLifecycleState {
  const w = (input.workflowState ?? "").toLowerCase();
  if (w === "archived" || input.foundationState === "archived") return "archived";
  if (w === "retired" || input.foundationState === "retired") return "retired";
  if (w === "published" || input.foundationState === "published") return "published";
  if (w === "deprecated") return "published";
  if (w === "approved" || w === "scheduled") return "approved";
  return "draft";
}
