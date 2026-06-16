import { describe, expect, it } from "vitest";
import {
  getOrderingSessionConsumedLines,
  getOrderingSessionTrackingLinkLabel,
} from "./orderingSessionCopy";

describe("orderingSessionCopy ORDER-LINKED-SESSION-1", () => {
  it("provides Arabic and English banner copy", () => {
    expect(getOrderingSessionConsumedLines("ar")[0]).toBe("لديك طلب قيد التنفيذ.");
    expect(getOrderingSessionConsumedLines("en")[0]).toBe("You have an order in progress.");
    expect(getOrderingSessionTrackingLinkLabel("ar")).toBe("متابعة حالة الطلب");
    expect(getOrderingSessionTrackingLinkLabel("en")).toBe("Track your order");
  });
});
