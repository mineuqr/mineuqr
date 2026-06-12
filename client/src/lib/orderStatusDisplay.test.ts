import { describe, expect, it } from "vitest";
import {
  formatOrderStatusHeadline,
  formatOrderStatusLabel,
  lifecycleStepIndex,
} from "./orderStatusDisplay";

describe("orderStatusDisplay PR-CUX-1B", () => {
  it("uses customer-friendly Arabic headlines", () => {
    expect(formatOrderStatusHeadline("pending", "ar")).toBe("تم استلام طلبك");
    expect(formatOrderStatusHeadline("preparing", "ar")).toBe("جاري تحضير طلبك");
    expect(formatOrderStatusHeadline("ready", "ar")).toBe("طلبك جاهز");
    expect(formatOrderStatusHeadline("served", "ar")).toBe("تم تقديم الطلب");
    expect(formatOrderStatusHeadline("cancelled", "ar")).toBe("تم إلغاء الطلب");
  });

  it("keeps lifecycle labels aligned with dashboard", () => {
    expect(formatOrderStatusLabel("pending", "ar")).toBe("قيد الانتظار");
    expect(formatOrderStatusLabel("preparing", "en")).toBe("Preparing");
  });

  it("maps cancelled outside the progress stepper", () => {
    expect(lifecycleStepIndex("cancelled")).toBe(-1);
    expect(lifecycleStepIndex("ready")).toBe(2);
  });
});
