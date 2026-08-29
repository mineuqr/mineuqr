/**
 * CHECK-RESIDUAL-FINANCIAL-REFERENCE-CLEANUP-1
 * financialReference is Settlement document correlation, not Financial Core.
 */
import { describe, expect, it } from "vitest";
import { resolveSettlementOperationalIdentity } from "@shared/operational-document-identity";
import { formatCashierInvoiceNumber } from "@shared/pos";
import { buildSettlementFinancialReference } from "../settlementRecordIdentity";

describe("Settlement financialReference semantics", () => {
  it("is Check-generation document correlation, not Invoice / CF / PAID", () => {
    const ref = buildSettlementFinancialReference({
      checkId: 2790012,
      recordGeneration: 1,
    });
    expect(ref).toBe("fin:check:2790012:gen:1");
    expect(ref).not.toBe(formatCashierInvoiceNumber(42));
    expect(ref).not.toBe("000042");
    expect(ref).not.toMatch(/^ST-/);
    expect(ref).not.toMatch(/^RF-/);
    expect(ref).not.toContain("cf-");
    expect(ref).not.toContain("collectionFact");
  });

  it("stays distinct from Invoice serial, Settlement number, and Order reference", () => {
    const invoice = formatCashierInvoiceNumber(42);
    const settlementNumber = resolveSettlementOperationalIdentity({
      checkId: 2790012,
    });
    const orderRef = "K #005";
    const ref = buildSettlementFinancialReference({
      checkId: 2790012,
      recordGeneration: 1,
    });
    expect(invoice).toBe("000042");
    expect(settlementNumber).toBe("ST-2790012");
    expect(new Set([invoice, settlementNumber, orderRef, ref]).size).toBe(4);
  });
});
