import { describe, expect, it } from "vitest";
import {
  formatOrderStatusHeadline,
  formatOrderStatusLabel,
  getOrderStepVisualState,
  isOrderStepConnectorCompleted,
  lifecycleStepIndex,
  orderLifecycleSteps,
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

  it("PR-CUX-1B-POLISH-1: distinguishes completed, current, and future steps", () => {
    expect(getOrderStepVisualState(0, 2, "ready")).toBe("completed");
    expect(getOrderStepVisualState(2, 2, "ready")).toBe("current");
    expect(getOrderStepVisualState(3, 2, "ready")).toBe("future");
  });

  it("PR-CUX-1B-POLISH-1: served marks all steps completed", () => {
    for (let i = 0; i < orderLifecycleSteps.length; i++) {
      expect(getOrderStepVisualState(i, 3, "served")).toBe("completed");
      expect(isOrderStepConnectorCompleted(i, 3, "served")).toBe(true);
    }
  });

  it("PR-CUX-1B-POLISH-1: connector fills only after completed steps", () => {
    expect(isOrderStepConnectorCompleted(0, 1, "preparing")).toBe(true);
    expect(isOrderStepConnectorCompleted(1, 1, "preparing")).toBe(false);
    expect(isOrderStepConnectorCompleted(0, 0, "pending")).toBe(false);
  });
});
