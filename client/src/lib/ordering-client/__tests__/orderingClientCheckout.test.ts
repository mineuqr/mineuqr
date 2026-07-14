import { describe, expect, it } from "vitest";
import {
  buildOrderSummaryLines,
  mapCheckoutSubmitError,
  presentOrderNoteError,
  validateCheckoutNotes,
} from "../checkout/checkoutSubmission";
import type { OrderingCartItem } from "../cart/cartTypes";

describe("ORDERING-CLIENT-CHECKOUT-1 submission helpers", () => {
  const items: OrderingCartItem[] = [
    {
      menuItemId: 1,
      nameAr: "أ",
      nameEn: "A",
      price: "10.00",
      quantity: 2,
      notes: "mild",
    },
  ];

  it("builds order summary lines with line totals", () => {
    const lines = buildOrderSummaryLines(items);
    expect(lines).toHaveLength(1);
    expect(lines[0]?.lineTotal).toBe(20);
    expect(lines[0]?.notes).toBe("mild");
  });

  it("validates order and item notes via platform contracts", () => {
    const ok = validateCheckoutNotes({
      orderNotes: "  extra bread  ",
      items,
      maxOrderNoteLength: 500,
      maxItemNoteLength: 300,
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.orderNotes).toBe("extra bread");
      expect(ok.items[0]?.notes).toBe("mild");
    }
  });

  it("rejects over-long order notes", () => {
    const bad = validateCheckoutNotes({
      orderNotes: "x".repeat(10),
      items,
      maxOrderNoteLength: 5,
      maxItemNoteLength: 300,
    });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error.code).toBe("ORDER_NOTE_INVALID");
  });

  it("rejects over-long item notes", () => {
    const bad = validateCheckoutNotes({
      orderNotes: "",
      items: [{ ...items[0]!, notes: "y".repeat(20) }],
      maxOrderNoteLength: 500,
      maxItemNoteLength: 5,
    });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error.code).toBe("ITEM_NOTE_INVALID");
  });

  it("maps generic submit failures by language", () => {
    expect(mapCheckoutSubmitError(new Error("x"), "en").code).toBe(
      "SUBMIT_FAILED"
    );
    expect(mapCheckoutSubmitError(new Error("x"), "ar").message).toContain(
      "خطأ"
    );
  });

  it("presents order note errors in Arabic for ar locale", () => {
    expect(presentOrderNoteError("Order note exceeds", "ar")).toBe(
      "ملاحظة الطلب طويلة جداً"
    );
    expect(presentOrderNoteError("Order note exceeds", "en")).toBe(
      "Order note exceeds"
    );
  });
});
