import { describe, expect, it } from "vitest";
import { sessionActionLabel } from "./diningSessionActionCopy";

describe("diningSessionActionCopy SETTLEMENT-ARCHITECTURE-1A", () => {
  it("provides Arabic settlement action labels", () => {
    expect(sessionActionLabel("markPaid", "ar")).toBe("تسجيل الدفع");
    expect(sessionActionLabel("markComplimentary", "ar")).toBe("ضيافة");
    expect(sessionActionLabel("closeSession", "ar")).toBe("إغلاق الجلسة");
  });

  it("provides close confirmation copy", () => {
    expect(sessionActionLabel("closeConfirmBody", "en")).toContain("free the table");
    expect(sessionActionLabel("closeConfirmBody", "ar")).toContain("تحرير الطاولة");
  });

  it("provides paid settlement confirmation copy", () => {
    expect(sessionActionLabel("paidConfirmBody", "en")).toContain("settled and closed");
  });
});
