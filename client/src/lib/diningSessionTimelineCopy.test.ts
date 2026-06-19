import { describe, expect, it } from "vitest";
import { formatTimelineEventDescription } from "./diningSessionTimelineCopy";

describe("diningSessionTimelineCopy SETTLEMENT-ARCHITECTURE-1A", () => {
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

  it("formats SESSION_PAID in Arabic", () => {
    expect(
      formatTimelineEventDescription({ eventType: "SESSION_PAID" }, "ar")
    ).toBe("تم تسجيل الدفع");
  });

  it("formats SESSION_COMPLIMENTARY", () => {
    expect(
      formatTimelineEventDescription({ eventType: "SESSION_COMPLIMENTARY" }, "en")
    ).toBe("Session complimentary");
  });

  it("formats SESSION_CLOSED", () => {
    expect(formatTimelineEventDescription({ eventType: "SESSION_CLOSED" }, "en")).toBe(
      "Session closed"
    );
  });
});
