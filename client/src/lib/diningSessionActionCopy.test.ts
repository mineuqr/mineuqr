import { describe, expect, it } from "vitest";
import { sessionActionLabel } from "./diningSessionActionCopy";

describe("diningSessionActionCopy (UX-1D)", () => {
  it("provides Arabic action labels", () => {
    expect(sessionActionLabel("requestBill", "ar")).toBe("طلب الفاتورة");
    expect(sessionActionLabel("markPaymentPending", "ar")).toBe("الدفع قيد المعالجة");
    expect(sessionActionLabel("closeSession", "ar")).toBe("إغلاق الجلسة");
  });

  it("provides close confirmation copy", () => {
    expect(sessionActionLabel("closeConfirmBody", "en")).toContain("free the table");
    expect(sessionActionLabel("closeConfirmBody", "ar")).toContain("تحرير الطاولة");
  });

  it("provides cancel bill confirmation copy", () => {
    expect(sessionActionLabel("cancelConfirmBody", "en")).toContain("place new orders");
  });
});
