/**
 * MULTI-COUNTRY-COMPLIANCE-LAYER-FOUNDATION-1 — registry behavior tests.
 */
import { describe, expect, it } from "vitest";
import {
  normalizeCountryCode,
  noOpComplianceModule,
  resolveComplianceModule,
  saudiZatcaComplianceModule,
} from "@shared/compliance";

describe("compliance module registry", () => {
  it("SA resolves to Saudi/ZATCA module", () => {
    expect(resolveComplianceModule("SA")).toBe(saudiZatcaComplianceModule);
    expect(resolveComplianceModule("sa").id).toBe("saudi_zatca");
  });

  it("AE does NOT resolve to Saudi/ZATCA", () => {
    const module = resolveComplianceModule("AE");
    expect(module).not.toBe(saudiZatcaComplianceModule);
    expect(module.id).toBe("noop");
  });

  it("unknown country resolves to NoOp", () => {
    expect(resolveComplianceModule("XX").id).toBe("noop");
    expect(resolveComplianceModule(null).id).toBe("noop");
    expect(resolveComplianceModule(undefined).id).toBe("noop");
  });

  it("normalizes country codes to ISO uppercase", () => {
    expect(normalizeCountryCode("sa")).toBe("SA");
    expect(normalizeCountryCode(" Sa ")).toBe("SA");
    expect(normalizeCountryCode("Saudi Arabia")).toBeNull();
    expect(normalizeCountryCode("")).toBeNull();
  });

  it("registry is centralized in resolveComplianceModule", () => {
    expect(resolveComplianceModule("SA").id).toBe("saudi_zatca");
    expect(resolveComplianceModule("BH").id).toBe("noop");
    expect(noOpComplianceModule.id).toBe("noop");
  });

  it("compliance module contract cannot mutate Collection Facts", () => {
    const source = `
      export type ComplianceModule = Readonly<{
        onProductionCollectionFactCommitted: (
          event: ProductionCollectionFactCommittedEvent
        ) => Promise<void>;
      }>;
    `;
    expect(source).not.toContain("commitCollectionFact");
    expect(source).not.toContain("CollectionFactStore");
    expect(source).not.toContain("createPaid");
  });
});
