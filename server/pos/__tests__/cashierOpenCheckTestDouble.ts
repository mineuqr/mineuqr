import type { CashierPosSaleOpenCheck } from "../../operational-session/check";

export function stubOpenCheckEnrollment(checkId = 900): CashierPosSaleOpenCheck {
  return {
    check: {
      id: checkId,
      restaurantId: 1,
      sessionId: null,
      outcome: "open",
      currencySnapshot: { currencyCode: "SAR", currencySymbol: "ر.س" },
      taxPolicySnapshot: {
        version: 1,
        enabled: false,
        mode: "exclusive",
        components: [],
      },
      serviceChargeSnapshot: null,
      billDiscountAmount: "0.00",
      subtotal: "12.50",
      taxAmount: "0.00",
      taxBreakdown: { lines: [], totalTaxAmount: "0.00" },
      grandTotal: "12.50",
      snapshotsFrozenAt: "2026-08-16T01:00:00.000Z",
      totalsFrozenAt: null,
      settledAt: null,
      voidedAt: null,
      createdAt: "2026-08-16T01:00:00.000Z",
      updatedAt: "2026-08-16T01:00:00.000Z",
    },
    lines: [
      {
        description: "Item",
        quantity: 2,
        netAmount: "12.50",
        originOrderItemId: 1,
      },
    ],
  };
}

export function stubCheckSnapshots() {
  return {
    currencySnapshot: { currencyCode: "SAR", currencySymbol: "ر.س" },
    taxPolicySnapshot: {
      version: 1,
      enabled: false,
      mode: "exclusive" as const,
      components: [],
    },
  };
}
