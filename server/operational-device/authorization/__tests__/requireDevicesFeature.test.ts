/**
 * COMMERCIAL-ENTITLEMENT-ENFORCEMENT-REPAIR-1
 * Adapter around requireFeature("devices") — fail closed, TRPC FORBIDDEN.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";

vi.mock("../../../subscription-runtime", () => ({
  requireFeature: vi.fn(),
}));

import { requireFeature } from "../../../subscription-runtime";
import { requireDevicesFeature } from "../requireDevicesFeature";

describe("requireDevicesFeature", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows when the hub grants devices", async () => {
    vi.mocked(requireFeature).mockResolvedValue(undefined);
    await expect(requireDevicesFeature(7)).resolves.toBeUndefined();
    expect(requireFeature).toHaveBeenCalledWith(7, "devices", undefined);
  });

  it("denies Basic / unentitled as FORBIDDEN", async () => {
    const denied = new Error("Commercial entitlement denied: devices (feature_denied)");
    (denied as Error & { code?: string }).code = "COMMERCIAL_ENTITLEMENT_DENIED";
    vi.mocked(requireFeature).mockRejectedValue(denied);

    await expect(requireDevicesFeature(7)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(requireDevicesFeature(7)).rejects.toBeInstanceOf(TRPCError);
  });

  it("denies expired / NONE when hub rejects", async () => {
    const denied = new Error("Commercial entitlement denied: devices (feature_denied)");
    (denied as Error & { code?: string }).code = "COMMERCIAL_ENTITLEMENT_DENIED";
    vi.mocked(requireFeature).mockRejectedValue(denied);

    await expect(requireDevicesFeature(22)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("fails closed when entitlement resolution throws", async () => {
    vi.mocked(requireFeature).mockRejectedValue(new Error("resolver unavailable"));

    await expect(requireDevicesFeature(3)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("never uses kitchen as the management capability", async () => {
    vi.mocked(requireFeature).mockResolvedValue(undefined);
    await requireDevicesFeature(1, new Date("2026-08-15T00:00:00.000Z"));
    expect(requireFeature).toHaveBeenCalledWith(
      1,
      "devices",
      new Date("2026-08-15T00:00:00.000Z")
    );
    expect(vi.mocked(requireFeature).mock.calls[0][1]).not.toBe("kitchen");
  });
});
