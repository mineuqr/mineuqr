import { describe, expect, it } from "vitest";
import {
  CASHIER_FINALIZABLE_ORDERING_CHANNELS,
  COMPLIMENTARY_COLLECTION_TENDER,
  isCashierFinalizableOrderingChannel,
  isComplimentaryCollectionFact,
} from "../cashierFinancialFinalization";
import { refundAnchorFromCollectionFact } from "../financialResponsibilityMap";

describe("UNIFIED-POS-FINANCIAL-AUTHORITY-1 cashier finalizable channels", () => {
  it("allows operational channels through Cashier only", () => {
    expect(CASHIER_FINALIZABLE_ORDERING_CHANNELS).toContain("cashier_pos");
    expect(CASHIER_FINALIZABLE_ORDERING_CHANNELS).toContain("table_session");
    expect(CASHIER_FINALIZABLE_ORDERING_CHANNELS).toContain("waiter_tablet");
    expect(CASHIER_FINALIZABLE_ORDERING_CHANNELS).toContain("qr");
    expect(CASHIER_FINALIZABLE_ORDERING_CHANNELS).toContain("kiosk");
    expect(isCashierFinalizableOrderingChannel("qr")).toBe(true);
    expect(isCashierFinalizableOrderingChannel("marketplace")).toBe(false);
  });

  it("treats zero collected amount plus waived discount as complimentary Collection Fact", () => {
    expect(
      isComplimentaryCollectionFact({ amount: "0.00", discountAmount: "20.00" })
    ).toBe(true);
    expect(
      isComplimentaryCollectionFact({ amount: "20.00", discountAmount: "0.00" })
    ).toBe(false);
    expect(
      isComplimentaryCollectionFact({ amount: "0.00", discountAmount: "0.00" })
    ).toBe(false);
    expect(COMPLIMENTARY_COLLECTION_TENDER).toEqual({
      paymentMethod: "other",
      amount: "0.00",
    });
  });

  it("anchors refund identity to the original Collection Fact", () => {
    expect(
      refundAnchorFromCollectionFact({
        collectionFactId: "pcf_1",
        orderId: 9,
        paymentIntentId: "pi_1",
      })
    ).toEqual({
      collectionFactId: "pcf_1",
      orderId: 9,
      paymentIntentId: "pi_1",
    });
  });
});
