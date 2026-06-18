import { describe, expect, it } from "vitest";
import { formatTimelineEventDescription } from "./diningSessionTimelineCopy";

describe("diningSessionTimelineCopy (UX-1C)", () => {
  it("formats SESSION_OPENED in Arabic", () => {
    expect(
      formatTimelineEventDescription({ eventType: "SESSION_OPENED" }, "ar")
    ).toBe("تم فتح الجلسة");
  });

  it("formats ORDER_CREATED with order number and total", () => {
    expect(
      formatTimelineEventDescription(
        {
          eventType: "ORDER_CREATED",
          orderNumber: "ORD-0142",
          totalAmount: "95.00",
        },
        "ar",
        "ر.س"
      )
    ).toBe("تم إنشاء الطلب ORD-0142 · 95.00 ر.س");
  });

  it("formats ORDER_CREATED without total", () => {
    expect(
      formatTimelineEventDescription(
        { eventType: "ORDER_CREATED", orderNumber: "ORD-0143" },
        "en"
      )
    ).toBe("Order ORD-0143 created");
  });

  it("includes future BILL_REQUESTED copy", () => {
    expect(
      formatTimelineEventDescription({ eventType: "BILL_REQUESTED" }, "ar")
    ).toBe("تم طلب الفاتورة");
  });
});
