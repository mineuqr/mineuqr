/**
 * COMMERCIAL-CATALOG-RATIONALIZATION-1 — presentation overlay guards.
 */
import { describe, expect, it } from "vitest";
import {
  COMMERCIAL_CATALOG_RATIONALIZATION_PROGRAM,
  COMMERCIAL_PRESENTATION_REGISTRY,
  SETTLEMENT_PROJECTION_KEYS,
  applyCommercialPresentationRules,
  listCommercialVisiblePresentation,
  listComparisonPresentation,
  projectFeatureKeysForCommercialDisplay,
  setPresentationCapabilityEnabled,
} from "@shared/commercial-catalog-presentation";
import { COMMERCIAL_PROJECTION_IDS } from "@shared/commercial-projection";

describe("COMMERCIAL-CATALOG-RATIONALIZATION-1", () => {
  it("exports program and keeps Projection identity set unchanged", () => {
    expect(COMMERCIAL_CATALOG_RATIONALIZATION_PROGRAM).toBe(
      "COMMERCIAL-CATALOG-RATIONALIZATION-1"
    );
    expect(COMMERCIAL_PROJECTION_IDS).toHaveLength(19);
  });

  it("hides expo, foundation, and devices from commercial comparison", () => {
    const visible = listCommercialVisiblePresentation().map(
      (c) => c.presentationId
    );
    expect(visible).not.toContain("expo");
    expect(visible).not.toContain("printing");
    expect(visible).not.toContain("realtime");
    expect(visible).not.toContain("devices");
    expect(visible).toContain("financialSettlement");
    expect(visible).toContain("sessionTableManagement");
    expect(visible).toContain("menuManagement");
    expect(visible).toContain("menuDesign");
    expect(visible).toContain("smartQr");
    expect(visible).toContain("kitchen");

    const comparison = listComparisonPresentation().map((c) => c.presentationId);
    expect(comparison).not.toContain("printing");
    expect(comparison).not.toContain("realtime");
  });

  it("nests settlement children as dependent (not independent commercial cards)", () => {
    for (const id of SETTLEMENT_PROJECTION_KEYS) {
      const row = COMMERCIAL_PRESENTATION_REGISTRY.find(
        (c) => c.presentationId === id
      );
      expect(row?.class).toBe("dependent");
      expect(row?.commercialVisible).toBe(false);
    }
    const parent = COMMERCIAL_PRESENTATION_REGISTRY.find(
      (c) => c.presentationId === "financialSettlement"
    );
    expect(parent?.projectionKeys).toEqual([...SETTLEMENT_PROJECTION_KEYS]);
  });

  it("auto-includes settlement when table ordering is enabled", () => {
    const next = applyCommercialPresentationRules({ ordering: true });
    for (const key of SETTLEMENT_PROJECTION_KEYS) {
      expect(next[key]).toBe(true);
    }
    expect(next.printing).toBe(true);
    expect(next.realtime).toBe(true);
  });

  it("auto-enables devices for kitchen / kiosk / waiter", () => {
    expect(applyCommercialPresentationRules({ kitchen: true }).devices).toBe(
      true
    );
    expect(applyCommercialPresentationRules({ kiosk: true }).devices).toBe(
      true
    );
    expect(applyCommercialPresentationRules({ waiter: true }).devices).toBe(
      true
    );
  });

  it("collapses public display keys per AA presentation rules", () => {
    const display = projectFeatureKeysForCommercialDisplay([
      "ordering",
      "checkManagement",
      "splitPayment",
      "printing",
      "realtime",
      "devices",
      "expo",
      "kitchen",
    ]);
    expect(display).toContain("ordering");
    expect(display).toContain("financialSettlement");
    expect(display).toContain("kitchen");
    expect(display).not.toContain("sessionTableManagement");
    expect(
      projectFeatureKeysForCommercialDisplay([
        "sessionTableManagement",
        "menuManagement",
        "menuDesign",
        "smartQr",
      ])
    ).toEqual([
      "sessionTableManagement",
      "menuManagement",
      "menuDesign",
      "smartQr",
    ]);
    expect(display).not.toContain("printing");
    expect(display).not.toContain("realtime");
    expect(display).not.toContain("devices");
    expect(display).not.toContain("expo");
    expect(display).not.toContain("checkManagement");
  });

  it("presentation toggle writes Projection keys only", () => {
    const next = setPresentationCapabilityEnabled({}, "financialSettlement", true);
    for (const key of SETTLEMENT_PROJECTION_KEYS) {
      expect(next[key]).toBe(true);
    }
    expect(next.expo).toBe(false);
  });

  it("catalog-promoted cards toggle independently", () => {
    const off = setPresentationCapabilityEnabled({}, "menuDesign", false);
    expect(off.menuDesign).toBe(false);
    const on = setPresentationCapabilityEnabled(off, "menuDesign", true);
    expect(on.menuDesign).toBe(true);
    expect(on.sessionTableManagement).toBe(false);
    expect(on.smartQr).toBe(false);
  });
});
