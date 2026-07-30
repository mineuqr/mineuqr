/**
 * COMMERCIAL-CATALOG-RATIONALIZATION-1
 *
 * Commercial Catalog presentation overlay over Commercial Projection.
 * Does NOT redesign Discovery, Projection, Catalog schema, or Runtime.
 * Plan/bundle persistence still uses Projection IDs only.
 */

import {
  COMMERCIAL_PROJECTION_IDS,
  type CommercialProjectionId,
} from "../commercial-projection/schema";

export const COMMERCIAL_CATALOG_RATIONALIZATION_PROGRAM =
  "COMMERCIAL-CATALOG-RATIONALIZATION-1" as const;

/** Category A / B / C */
export const COMMERCIAL_PRESENTATION_CLASSES = [
  "commercial",
  "foundation",
  "dependent",
] as const;

export type CommercialPresentationClass =
  (typeof COMMERCIAL_PRESENTATION_CLASSES)[number];

export type CommercialPresentationDomainId =
  | "orders"
  | "settlement"
  | "register"
  | "ops_display"
  | "menu"
  | "sessions"
  | "qr"
  | "design"
  | "reports"
  | "platform";

export type CommercialPresentationCapability = {
  presentationId: string;
  class: CommercialPresentationClass;
  /** Projection keys written when this card is toggled (empty = presentation-only). */
  projectionKeys: readonly CommercialProjectionId[];
  /** Nested dependent projection keys shown in details only. */
  detailProjectionKeys?: readonly CommercialProjectionId[];
  /** Hide from commercial picker / comparison (expo, foundation, devices). */
  commercialVisible: boolean;
  /** Include in plan comparison metrics (excludes foundation). */
  comparisonVisible: boolean;
  /** Always on; checkbox locked when shown. */
  alwaysEnabled: boolean;
  /** Dependency-driven (devices): not marketed; forced by parents. */
  dependencyDriven?: boolean;
  experienceDomain: CommercialPresentationDomainId;
  /** Discovery CAP references for documentation (not Projection redesign). */
  discoveryCapabilityIds: readonly string[];
};

/**
 * Normative commercial presentation registry (AA decisions).
 * Projection identities preserved via projectionKeys mapping.
 */
export const COMMERCIAL_PRESENTATION_REGISTRY: readonly CommercialPresentationCapability[] =
  [
    {
      presentationId: "sessionTableManagement",
      class: "commercial",
      projectionKeys: [],
      commercialVisible: true,
      comparisonVisible: true,
      alwaysEnabled: true,
      experienceDomain: "sessions",
      discoveryCapabilityIds: ["CAP-06", "CAP-07"],
    },
    {
      presentationId: "menuManagement",
      class: "commercial",
      projectionKeys: [],
      commercialVisible: true,
      comparisonVisible: true,
      alwaysEnabled: true,
      experienceDomain: "menu",
      discoveryCapabilityIds: ["CAP-05"],
    },
    {
      presentationId: "menuDesign",
      class: "commercial",
      projectionKeys: [],
      commercialVisible: true,
      comparisonVisible: true,
      alwaysEnabled: true,
      experienceDomain: "design",
      discoveryCapabilityIds: ["CAP-05"],
    },
    {
      presentationId: "smartQr",
      class: "commercial",
      projectionKeys: [],
      commercialVisible: true,
      comparisonVisible: true,
      alwaysEnabled: true,
      experienceDomain: "qr",
      discoveryCapabilityIds: ["CAP-06"],
    },
    {
      presentationId: "ordering",
      class: "commercial",
      projectionKeys: ["ordering"],
      commercialVisible: true,
      comparisonVisible: true,
      alwaysEnabled: false,
      experienceDomain: "orders",
      discoveryCapabilityIds: ["CAP-03"],
    },
    {
      presentationId: "waiter",
      class: "commercial",
      projectionKeys: ["waiter"],
      commercialVisible: true,
      comparisonVisible: true,
      alwaysEnabled: false,
      experienceDomain: "orders",
      discoveryCapabilityIds: ["CAP-31"],
    },
    {
      presentationId: "kiosk",
      class: "commercial",
      projectionKeys: ["kiosk"],
      commercialVisible: true,
      comparisonVisible: true,
      alwaysEnabled: false,
      experienceDomain: "orders",
      discoveryCapabilityIds: ["CAP-32"],
    },
    {
      presentationId: "counterPickup",
      class: "commercial",
      projectionKeys: ["counterPickup"],
      commercialVisible: true,
      comparisonVisible: true,
      alwaysEnabled: false,
      experienceDomain: "orders",
      discoveryCapabilityIds: ["CAP-33"],
    },
    {
      presentationId: "financialSettlement",
      class: "commercial",
      projectionKeys: [
        "checkManagement",
        "splitPayment",
        "multiCheckAllocation",
        "refund",
      ],
      detailProjectionKeys: [
        "checkManagement",
        "splitPayment",
        "multiCheckAllocation",
        "refund",
      ],
      commercialVisible: true,
      comparisonVisible: true,
      alwaysEnabled: false,
      experienceDomain: "settlement",
      discoveryCapabilityIds: ["CAP-08", "CAP-10", "CAP-11", "CAP-13"],
    },
    {
      presentationId: "checkManagement",
      class: "dependent",
      projectionKeys: ["checkManagement"],
      commercialVisible: false,
      comparisonVisible: false,
      alwaysEnabled: false,
      experienceDomain: "settlement",
      discoveryCapabilityIds: ["CAP-08"],
    },
    {
      presentationId: "splitPayment",
      class: "dependent",
      projectionKeys: ["splitPayment"],
      commercialVisible: false,
      comparisonVisible: false,
      alwaysEnabled: false,
      experienceDomain: "settlement",
      discoveryCapabilityIds: ["CAP-10"],
    },
    {
      presentationId: "multiCheckAllocation",
      class: "dependent",
      projectionKeys: ["multiCheckAllocation"],
      commercialVisible: false,
      comparisonVisible: false,
      alwaysEnabled: false,
      experienceDomain: "settlement",
      discoveryCapabilityIds: ["CAP-11"],
    },
    {
      presentationId: "refund",
      class: "dependent",
      projectionKeys: ["refund"],
      commercialVisible: false,
      comparisonVisible: false,
      alwaysEnabled: false,
      experienceDomain: "settlement",
      discoveryCapabilityIds: ["CAP-13"],
    },
    {
      presentationId: "register",
      class: "commercial",
      projectionKeys: ["register"],
      commercialVisible: true,
      comparisonVisible: true,
      alwaysEnabled: false,
      experienceDomain: "register",
      discoveryCapabilityIds: ["CAP-16", "CAP-17"],
    },
    {
      presentationId: "kitchen",
      class: "commercial",
      projectionKeys: ["kitchen"],
      commercialVisible: true,
      comparisonVisible: true,
      alwaysEnabled: false,
      experienceDomain: "ops_display",
      discoveryCapabilityIds: ["CAP-26"],
    },
    {
      presentationId: "expo",
      class: "commercial",
      projectionKeys: ["expo"],
      commercialVisible: false,
      comparisonVisible: false,
      alwaysEnabled: false,
      experienceDomain: "ops_display",
      discoveryCapabilityIds: ["CAP-47"],
    },
    {
      presentationId: "reporting",
      class: "commercial",
      projectionKeys: ["reporting"],
      commercialVisible: true,
      comparisonVisible: true,
      alwaysEnabled: false,
      experienceDomain: "reports",
      discoveryCapabilityIds: ["CAP-22"],
    },
    {
      presentationId: "printing",
      class: "foundation",
      projectionKeys: ["printing"],
      commercialVisible: false,
      comparisonVisible: false,
      alwaysEnabled: true,
      experienceDomain: "platform",
      discoveryCapabilityIds: ["CAP-27"],
    },
    {
      presentationId: "realtime",
      class: "foundation",
      projectionKeys: ["realtime"],
      commercialVisible: false,
      comparisonVisible: false,
      alwaysEnabled: true,
      experienceDomain: "platform",
      discoveryCapabilityIds: ["CAP-28"],
    },
    {
      presentationId: "devices",
      class: "dependent",
      projectionKeys: ["devices"],
      commercialVisible: false,
      comparisonVisible: false,
      alwaysEnabled: false,
      dependencyDriven: true,
      experienceDomain: "platform",
      discoveryCapabilityIds: ["CAP-29", "CAP-30"],
    },
  ] as const;

export const SETTLEMENT_PROJECTION_KEYS = [
  "checkManagement",
  "splitPayment",
  "multiCheckAllocation",
  "refund",
] as const satisfies readonly CommercialProjectionId[];

export const DEVICE_TRIGGER_PROJECTION_KEYS = [
  "kitchen",
  "kiosk",
  "waiter",
  "expo",
] as const satisfies readonly CommercialProjectionId[];

export const FOUNDATION_PROJECTION_KEYS = [
  "printing",
  "realtime",
] as const satisfies readonly CommercialProjectionId[];

export function listCommercialVisiblePresentation(): CommercialPresentationCapability[] {
  return COMMERCIAL_PRESENTATION_REGISTRY.filter((c) => c.commercialVisible);
}

export function listComparisonPresentation(): CommercialPresentationCapability[] {
  return COMMERCIAL_PRESENTATION_REGISTRY.filter((c) => c.comparisonVisible);
}

export function getPresentationCapability(
  presentationId: string
): CommercialPresentationCapability | undefined {
  return COMMERCIAL_PRESENTATION_REGISTRY.find(
    (c) => c.presentationId === presentationId
  );
}

/**
 * Apply AA commercial rules onto a Projection feature map.
 * - Foundation always on
 * - Table ordering ⇒ financial settlement bundle
 * - Kitchen / kiosk / waiter (/ expo) ⇒ devices
 * - Expo remains off unless explicitly set (hidden UI keeps it false)
 */
export function applyCommercialPresentationRules(
  features: Readonly<Record<string, boolean>>
): Record<string, boolean> {
  const next: Record<string, boolean> = {};
  for (const id of COMMERCIAL_PROJECTION_IDS) {
    next[id] = Boolean(features[id]);
  }

  for (const key of FOUNDATION_PROJECTION_KEYS) {
    next[key] = true;
  }

  if (next.ordering) {
    for (const key of SETTLEMENT_PROJECTION_KEYS) {
      next[key] = true;
    }
  }

  const needsDevices = DEVICE_TRIGGER_PROJECTION_KEYS.some((k) => next[k]);
  if (needsDevices) {
    next.devices = true;
  }

  // Expo remains hidden commercially — do not auto-enable from other toggles.
  return next;
}

/** Whether the financialSettlement presentation card is enabled. */
export function isFinancialSettlementEnabled(
  features: Readonly<Record<string, boolean>>
): boolean {
  return SETTLEMENT_PROJECTION_KEYS.every((k) => Boolean(features[k]));
}

/**
 * Toggle a presentation card into a Projection feature map, then apply rules.
 */
export function setPresentationCapabilityEnabled(
  features: Readonly<Record<string, boolean>>,
  presentationId: string,
  enabled: boolean
): Record<string, boolean> {
  const card = getPresentationCapability(presentationId);
  if (!card || card.alwaysEnabled || card.dependencyDriven) {
    return applyCommercialPresentationRules(features);
  }
  const next = { ...features };
  for (const key of card.projectionKeys) {
    next[key] = enabled;
  }
  return applyCommercialPresentationRules(next);
}

/**
 * Collapse Projection feature keys for public/pricing display.
 * Hides foundation, devices, expo, and nests settlement under one label key.
 */
export function projectFeatureKeysForCommercialDisplay(
  featureKeys: readonly string[]
): string[] {
  const set = new Set(featureKeys);
  const out: string[] = [];

  // Always-on commercial presentation (core platform value).
  for (const id of [
    "sessionTableManagement",
    "menuManagement",
    "menuDesign",
    "smartQr",
  ] as const) {
    out.push(id);
  }

  if (set.has("ordering")) out.push("ordering");
  if (set.has("waiter")) out.push("waiter");
  if (set.has("kiosk")) out.push("kiosk");
  if (set.has("counterPickup")) out.push("counterPickup");

  if (SETTLEMENT_PROJECTION_KEYS.some((k) => set.has(k))) {
    out.push("financialSettlement");
  }

  if (set.has("register")) out.push("register");
  if (set.has("kitchen")) out.push("kitchen");
  if (set.has("reporting")) out.push("reporting");

  // Intentionally omit: printing, realtime, devices, expo, raw settlement children
  return out;
}

export function presentationNameI18nKey(presentationId: string): string {
  return `admin.platformOps.commercialCatalog.presentation.${presentationId}.name`;
}

export function presentationDescriptionI18nKey(presentationId: string): string {
  return `admin.platformOps.commercialCatalog.presentation.${presentationId}.description`;
}

export function presentationDetailI18nKey(
  presentationId: string,
  detailKey: string
): string {
  return `admin.platformOps.commercialCatalog.presentation.${presentationId}.details.${detailKey}`;
}
