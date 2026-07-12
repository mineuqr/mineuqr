import { describe, expect, it } from "vitest";
import { resolveOperationalScreenAction } from "../deviceOrderExecutionCapabilities";

describe("deviceOrderExecutionCapabilities", () => {
  it("never exposes accept-order on the operational screen", () => {
    expect(resolveOperationalScreenAction("kitchen_display", "pending")).toBeNull();
  });

  it("resolves execution actions after acceptance", () => {
    expect(resolveOperationalScreenAction("kitchen_display", "preparing")).toBeNull();
    expect(resolveOperationalScreenAction("expo_display", "preparing")?.id).toBe("mark-ready");
    expect(resolveOperationalScreenAction("expo_display", "ready")?.id).toBe("serve-order");
  });

  it("returns null when role cannot act on status", () => {
    expect(resolveOperationalScreenAction("kitchen_display", "ready")).toBeNull();
  });
});
