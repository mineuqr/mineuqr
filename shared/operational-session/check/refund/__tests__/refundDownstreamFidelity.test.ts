/**
 * REFUND-DOWNSTREAM-FIDELITY-AND-CUSTODY-HARDENING-1
 */
import { describe, expect, it } from "vitest";
import {
  allocateRefundAcrossTenders,
  buildRefundPaymentSnapshotLines,
} from "../refundTenderAllocation";
import { buildRefundReverseSnapshot } from "../refundTaxSnapshot";

describe("allocateRefundAcrossTenders", () => {
  it("mirrors original tenders on full refund", () => {
    const lines = allocateRefundAcrossTenders({
      refundAmount: "100.00",
      originalTenders: [
        { paymentMethod: "cash", amount: "40.00" },
        { paymentMethod: "card", amount: "60.00" },
      ],
    });
    expect(lines).toEqual([
      { paymentMethod: "cash", amount: "40.00" },
      { paymentMethod: "card", amount: "60.00" },
    ]);
  });

  it("allocates partial refund proportionally with exact sum", () => {
    const lines = allocateRefundAcrossTenders({
      refundAmount: "50.00",
      originalTenders: [
        { paymentMethod: "cash", amount: "40.00" },
        { paymentMethod: "card", amount: "60.00" },
      ],
    });
    const sum = lines.reduce((s, l) => s + Number(l.amount), 0);
    expect(sum).toBe(50);
    expect(lines.find((l) => l.paymentMethod === "cash")?.amount).toBe("20.00");
    expect(lines.find((l) => l.paymentMethod === "card")?.amount).toBe("30.00");
  });

  it("prefers original tenders over explicit method in paymentSnapshot", () => {
    const snapshot = buildRefundPaymentSnapshotLines({
      refundAmount: "100.00",
      originalTenders: [
        { paymentMethod: "cash", amount: "40.00" },
        { paymentMethod: "card", amount: "60.00" },
      ],
      explicitTenderMethod: "card",
      currencyCode: "SAR",
      businessTimestamp: "t1",
      reference: "rf",
    });
    expect(snapshot).toHaveLength(2);
    expect(snapshot.map((s) => s.paymentMethod).sort()).toEqual(["card", "cash"]);
  });

  it("falls back to explicit tender when original tenders are empty", () => {
    const snapshot = buildRefundPaymentSnapshotLines({
      refundAmount: "25.00",
      originalTenders: [],
      explicitTenderMethod: "card",
      currencyCode: "SAR",
      businessTimestamp: "t1",
      reference: null,
    });
    expect(snapshot).toEqual([
      expect.objectContaining({
        paymentMethod: "card",
        amount: "25.00",
        status: "refunded",
      }),
    ]);
  });
});

describe("buildRefundReverseSnapshot tax fidelity", () => {
  const original = {
    grandTotal: "115.00",
    subtotal: "100.00",
    taxAmount: "15.00",
    taxBreakdown: {
      totalTaxAmount: "15.00",
      lines: [
        {
          componentId: "vat",
          name: "VAT",
          ratePercent: "15.00",
          amount: "15.00",
        },
      ],
    },
  };

  it("mirrors tax on full refund", () => {
    const snap = buildRefundReverseSnapshot("115.00", original);
    expect(snap.taxAmount).toBe("15.00");
    expect(snap.subtotal).toBe("100.00");
    expect(snap.grandTotal).toBe("115.00");
    expect(snap.taxBreakdown.lines[0]?.amount).toBe("15.00");
  });

  it("allocates proportional tax on partial refund", () => {
    const snap = buildRefundReverseSnapshot("57.50", original);
    expect(snap.grandTotal).toBe("57.50");
    expect(snap.taxAmount).toBe("7.50");
    expect(snap.subtotal).toBe("50.00");
    expect(
      Number(snap.subtotal) + Number(snap.taxAmount)
    ).toBeCloseTo(57.5, 2);
  });

  it("keeps zero tax when no original basis", () => {
    const snap = buildRefundReverseSnapshot("10.00", null);
    expect(snap.taxAmount).toBe("0.00");
    expect(snap.subtotal).toBe("10.00");
  });
});
