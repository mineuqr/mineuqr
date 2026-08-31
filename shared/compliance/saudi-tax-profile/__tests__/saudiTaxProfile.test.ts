/**
 * SAUDI-TAX-PROFILE-1 — VAT number structure + readiness tests.
 */
import { describe, expect, it } from "vitest";
import {
  evaluateSaudiTaxProfileReadiness,
  validateSaudiVatNumberStructure,
} from "@shared/compliance";

describe("Saudi VAT number structural validation", () => {
  it("classifies empty, malformed, and structurally valid", () => {
    expect(validateSaudiVatNumberStructure(null)).toBe("empty");
    expect(validateSaudiVatNumberStructure("")).toBe("empty");
    expect(validateSaudiVatNumberStructure("123")).toBe("malformed");
    expect(validateSaudiVatNumberStructure("123456789012345")).toBe("malformed");
    expect(validateSaudiVatNumberStructure("310175397400001")).toBe(
      "structurally_valid"
    );
  });
});

describe("Saudi Tax Profile readiness", () => {
  it("NOT_CONFIGURED when no profile", () => {
    expect(evaluateSaudiTaxProfileReadiness(null).readiness).toBe(
      "NOT_CONFIGURED"
    );
  });

  it("INCOMPLETE when status is unknown", () => {
    expect(
      evaluateSaudiTaxProfileReadiness({
        legalName: "Acme",
        vatRegistrationStatus: "unknown",
        vatNumber: null,
        registeredAddress: null,
      }).readiness
    ).toBe("INCOMPLETE");
  });

  it("READY for not_registered with legal name", () => {
    expect(
      evaluateSaudiTaxProfileReadiness({
        legalName: "Acme",
        vatRegistrationStatus: "not_registered",
        vatNumber: null,
        registeredAddress: null,
      }).readiness
    ).toBe("READY");
  });

  it("INCOMPLETE for registered without valid VAT/address", () => {
    expect(
      evaluateSaudiTaxProfileReadiness({
        legalName: "Acme",
        vatRegistrationStatus: "registered",
        vatNumber: "123",
        registeredAddress: "Riyadh",
      }).readiness
    ).toBe("INCOMPLETE");
  });

  it("READY for registered with structural VAT + address", () => {
    expect(
      evaluateSaudiTaxProfileReadiness({
        legalName: "Acme",
        vatRegistrationStatus: "registered",
        vatNumber: "310175397400001",
        registeredAddress: "Riyadh",
      }).readiness
    ).toBe("READY");
  });

  it("never treats incomplete registered profile as READY", () => {
    const result = evaluateSaudiTaxProfileReadiness({
      legalName: "Acme",
      vatRegistrationStatus: "registered",
      vatNumber: null,
      registeredAddress: null,
    });
    expect(result.readiness).not.toBe("READY");
    expect(result.readiness).toBe("INCOMPLETE");
  });
});
