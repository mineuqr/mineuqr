import { describe, expect, it } from "vitest";
import { resolveDeviceOperationalAction } from "../deviceOrderExecutionCapabilities";

describe("deviceOrderExecutionCapabilities", () => {
  it("resolves kitchen primary actions for presentation", () => {
    expect(resolveDeviceOperationalAction("kitchen_display", "pending")?.id).toBe("accept-order");
    expect(resolveDeviceOperationalAction("kitchen_display", "preparing")?.id).toBe("mark-ready");
    expect(resolveDeviceOperationalAction("expo_display", "ready")?.id).toBe("serve-order");
  });

  it("returns null when role cannot act on status", () => {
    expect(resolveDeviceOperationalAction("kitchen_display", "ready")).toBeNull();
  });
});
