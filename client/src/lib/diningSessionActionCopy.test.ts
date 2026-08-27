import { describe, expect, it } from "vitest";
import { sessionActionLabel } from "./diningSessionActionCopy";

describe("diningSessionActionCopy SETTLEMENT-ARCHITECTURE-1A", () => {
  it("provides Arabic settlement action labels", () => {
    expect(sessionActionLabel("sendToCashier", "ar")).toBe("إرسال للكاشير");
    expect(sessionActionLabel("markComplimentary", "ar")).toBe("ضيافة");
    expect(sessionActionLabel("closeSession", "ar")).toBe("إغلاق الجلسة");
  });

  it("provides close confirmation copy", () => {
    expect(sessionActionLabel("closeConfirmBody", "en")).toContain("free the table");
    expect(sessionActionLabel("closeConfirmBody", "ar")).toContain("تحرير الطاولة");
  });

  it("sends complimentary to Cashier without auto-close copy", () => {
    expect(sessionActionLabel("complimentaryConfirmBody", "en")).toContain(
      "does not close automatically"
    );
    expect(sessionActionLabel("complimentaryConfirmBody", "en")).not.toContain(
      "closed automatically"
    );
  });
});
