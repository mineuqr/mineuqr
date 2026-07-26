/**
 * REFUND-OPERATIONAL-WORKFLOW-ADOPTION-2 — Settlement Number parse.
 */
import { describe, expect, it } from "vitest";
import { parseSettlementOperationalIdentity } from "../provider";

describe("parseSettlementOperationalIdentity", () => {
  it("parses ST- padded identity", () => {
    const parsed = parseSettlementOperationalIdentity("ST-000570004");
    expect(parsed?.checkId).toBe(570004);
    expect(parsed?.recordGeneration).toBe(1);
    expect(parsed?.channel).toBe("manual");
  });

  it("parses generation suffix", () => {
    const parsed = parseSettlementOperationalIdentity("ST-000570004-2");
    expect(parsed?.checkId).toBe(570004);
    expect(parsed?.recordGeneration).toBe(2);
  });

  it("parses bare check digits", () => {
    const parsed = parseSettlementOperationalIdentity("570004");
    expect(parsed?.checkId).toBe(570004);
  });

  it("rejects persistence identities", () => {
    expect(parseSettlementOperationalIdentity("sr:720007:570004:settlement:1")).toBeNull();
  });
});
