import { describe, expect, it } from "vitest";
import { getOrderTrackingExpiredLines } from "./orderTrackingExpiredCopy";

describe("orderTrackingExpiredCopy TRACKING-EXPIRY-1", () => {
  it("provides Arabic expired page copy", () => {
    expect(getOrderTrackingExpiredLines("ar")).toEqual([
      "انتهت صلاحية صفحة التتبع.",
      "تم إكمال هذا الطلب.",
      "لإنشاء طلب جديد يرجى مسح رمز الطاولة.",
    ]);
  });
});
