/**
 * COMMERCIAL-CAPABILITY-EXPERIENCE-1 + COMMERCIAL-CATALOG-RATIONALIZATION-1
 * Presentation helpers — Commercial Catalog rationalization over Projection.
 */

import {
  COMMERCIAL_CAPABILITY_FILTER_REGISTRY,
  type CommercialCapabilityFilterKey,
} from "@shared/commercial-capability";
import {
  applyCommercialPresentationRules,
  isFinancialSettlementEnabled,
  listComparisonPresentation,
  listCommercialVisiblePresentation,
  setPresentationCapabilityEnabled,
  type CommercialPresentationCapability,
  type CommercialPresentationDomainId,
} from "@shared/commercial-catalog-presentation";

export const CAPABILITY_EXPERIENCE_DOMAIN_ORDER = [
  "sessions",
  "menu",
  "design",
  "qr",
  "orders",
  "settlement",
  "register",
  "ops_display",
  "reports",
  "platform",
] as const;

export type CapabilityExperienceDomainId =
  (typeof CAPABILITY_EXPERIENCE_DOMAIN_ORDER)[number];

/** Card shown in commercial picker (rationalized). */
export type CapabilityExperienceCard = CommercialPresentationCapability & {
  experienceDomain: CapabilityExperienceDomainId;
  /** Projection filter key for developer toggle (primary) */
  filterKey: string;
};

export function experienceDomainForCategory(
  category: string
): CapabilityExperienceDomainId {
  const map: Record<string, CapabilityExperienceDomainId> = {
    sessions: "sessions",
    menu: "menu",
    design: "design",
    qr: "qr",
    orders: "orders",
    settlement: "settlement",
    register: "register",
    ops_display: "ops_display",
    reports: "reports",
    platform: "platform",
  };
  return map[category] ?? "platform";
}

/** @deprecated Prefer presentation domains. */
export function experienceDomainForOwner(
  ownerDomain: string
): CapabilityExperienceDomainId {
  void ownerDomain;
  return "platform";
}

export function listCapabilityExperienceCards(): CapabilityExperienceCard[] {
  return listCommercialVisiblePresentation().map((row) => ({
    ...row,
    experienceDomain: row.experienceDomain as CapabilityExperienceDomainId,
    filterKey: row.presentationId,
  }));
}

export function listComparisonExperienceCards(): CapabilityExperienceCard[] {
  return listComparisonPresentation().map((row) => ({
    ...row,
    experienceDomain: row.experienceDomain as CapabilityExperienceDomainId,
    filterKey: row.presentationId,
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
    map.get(card.experienceDomain)?.push(card);
  }
  return CAPABILITY_EXPERIENCE_DOMAIN_ORDER.map((domainId) => ({
    domainId,
    capabilities: map.get(domainId) ?? [],
  })).filter((g) => g.capabilities.length > 0);
}

export function isPresentationCardEnabled(
  card: CommercialPresentationCapability,
  features: Readonly<Record<string, boolean>>
): boolean {
  if (card.alwaysEnabled) return true;
  if (card.presentationId === "financialSettlement") {
    return isFinancialSettlementEnabled(features);
  }
  if (card.projectionKeys.length === 0) return card.alwaysEnabled;
  return card.projectionKeys.every((k) => Boolean(features[k]));
}

export function countEnabledCapabilities(
  selected: Record<string, boolean>
): { total: number; enabled: number; disabled: number } {
  const cards = listComparisonExperienceCards();
  const total = cards.length;
  let enabled = 0;
  for (const card of cards) {
    if (isPresentationCardEnabled(card, selected)) enabled += 1;
  }
  return { total, enabled, disabled: total - enabled };
}

export function applyPickerChange(
  features: Readonly<Record<string, boolean>>,
  presentationId: string,
  enabled: boolean
): Record<string, boolean> {
  return setPresentationCapabilityEnabled(features, presentationId, enabled);
}

export function normalizePlanFeatures(
  features: Readonly<Record<string, boolean>>
): Record<string, boolean> {
  return applyCommercialPresentationRules(features);
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
