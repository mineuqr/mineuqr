/**
 * REFUND-DOCUMENT-NUMBERING-ADOPTION-1 — document identity unit tests.
 */
import { describe, expect, it } from "vitest";
import type { SettlementRecord } from "@shared/operational-session";
import { resolveSettlementRecordDocumentIdentity } from "../settlementRecordDocumentIdentity";

function sample(
  overrides: Partial<SettlementRecord> = {}
): SettlementRecord {
  return {
    settlementRecordId: "sr:1:570004:settlement:1",
    restaurantId: 1,
    recordKind: "settlement",
    schemaVersion: 1,
    recordGeneration: 1,
    checkId: 570004,
    sessionId: null,
    financialReference: null,
    priorSettlementRecordId: null,
    orderRefs: [],
    orderSettlementRefs: [],
    subtotal: "70.00",
    discountAmount: "0.00",
    taxAmount: "0.00",
    grandTotal: "70.00",
    outcome: "paid",
    currencySnapshot: { currencyCode: "SAR", currencySymbol: "ر.س" },
    taxPolicySnapshot: {
      version: 1,
      enabled: true,
      mode: "exclusive",
      components: [],
    },
    taxBreakdown: { totalTaxAmount: "0.00", lines: [] },
    paymentSnapshot: [],
    businessDay: "2026-07-26",
    settledAt: "2026-07-26T10:00:00.000Z",
    createdAt: "2026-07-26T10:00:00.000Z",
    createdByActorType: "user",
    createdByActorId: "1",
    producer: "check_aggregate",
    ...overrides,
  };
}

describe("resolveSettlementRecordDocumentIdentity", () => {
  it("keeps Settlement identity as ST independent of refund sequence", () => {
    const id = resolveSettlementRecordDocumentIdentity(sample(), null);
    expect(id.documentType).toBe("settlement");
    expect(id.documentNumber).toBe("ST-570004");
    expect(id.originSettlementNumber).toBeNull();
    expect(id.refundNumber).toBeNull();
  });

  it("assigns independent RF number and origin ST for refunds", () => {
    const id = resolveSettlementRecordDocumentIdentity(
      sample({
        settlementRecordId: "sr:1:570004:refund:2",
        recordKind: "refund",
        recordGeneration: 2,
        priorSettlementRecordId: "sr:1:570004:settlement:1",
      }),
      1
    );
    expect(id.documentType).toBe("refund");
    expect(id.documentNumber).toBe("RF-000001");
    expect(id.refundNumber).toBe("RF-000001");
    expect(id.originSettlementNumber).toBe("ST-570004");
    expect(id.documentNumber).not.toBe(id.originSettlementNumber);
  });

  it("falls back to historical ST-generation when RF not yet bound", () => {
    const id = resolveSettlementRecordDocumentIdentity(
      sample({
        settlementRecordId: "sr:1:570004:refund:2",
        recordKind: "refund",
        recordGeneration: 2,
      }),
      null
    );
    expect(id.documentNumber).toBe("ST-570004-2");
    expect(id.refundNumber).toBeNull();
  });
});
