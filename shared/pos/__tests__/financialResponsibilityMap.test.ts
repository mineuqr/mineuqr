import { describe, expect, it } from "vitest";
import {
  ATTRIBUTION_RESPONSIBILITY_MAP,
  CHECK_ST_OS_SR_CLASSIFICATION,
  FINANCIAL_RESPONSIBILITY_MAP,
  REFUND_RESPONSIBILITY_MAP,
} from "../financialResponsibilityMap";

describe("UNIFIED-POS-FINANCIAL-AUTHORITY-1 responsibility maps", () => {
  it("sources financial answers from Collection Fact, not SR", () => {
    expect(FINANCIAL_RESPONSIBILITY_MAP.whatWasPaid).toContain("Collection Fact");
    expect(FINANCIAL_RESPONSIBILITY_MAP.financialStatus).toContain("production CF");
    expect(FINANCIAL_RESPONSIBILITY_MAP.complimentary).toContain(
      "isComplimentaryCollectionFact"
    );
    expect(ATTRIBUTION_RESPONSIBILITY_MAP.srRole).toContain("not financial SSOT");
    expect(ATTRIBUTION_RESPONSIBILITY_MAP.cfRole).toContain("Financial root");
  });

  it("keeps refund identity on the original Collection Fact while Check refund stays compatibility", () => {
    expect(REFUND_RESPONSIBILITY_MAP.targetFinancialIdentity).toContain(
      "Collection Fact"
    );
    expect(REFUND_RESPONSIBILITY_MAP.currentEngine).toContain("applyRefundOnCheck");
    expect(CHECK_ST_OS_SR_CLASSIFICATION.check.independentSettlement).toBe(false);
    expect(CHECK_ST_OS_SR_CLASSIFICATION.sr.financial).toBe(false);
  });
});
