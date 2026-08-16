/**
 * COMMERCIAL-PLAN-CAPABILITY-GATING-IMPLEMENTATION-1
 * Adapter: restaurant owner → requireFeature(canonical key). Fail closed.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";

vi.mock("../../db", () => ({
  getRestaurantById: vi.fn(),
}));

vi.mock("../enforcement", () => ({
  requireFeature: vi.fn(),
}));

import { getRestaurantById } from "../../db";
import { requireFeature } from "../enforcement";
import { requireRestaurantPlanFeature } from "../requireRestaurantPlanFeature";

describe("requireRestaurantPlanFeature", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRestaurantById).mockResolvedValue({
      id: 9,
      userId: 42,
    } as never);
  });

  it("resolves the restaurant owner and requires the canonical key", async () => {
    vi.mocked(requireFeature).mockResolvedValue(undefined);
    await expect(
      requireRestaurantPlanFeature(9, "menuManagement")
    ).resolves.toBeUndefined();
    expect(requireFeature).toHaveBeenCalledWith(42, "menuManagement", undefined);
  });

  it("denies COMMERCIAL_ENTITLEMENT_DENIED as FORBIDDEN", async () => {
    const denied = new Error("Commercial entitlement denied: menuDesign (feature_denied)");
    (denied as Error & { code?: string }).code = "COMMERCIAL_ENTITLEMENT_DENIED";
    vi.mocked(requireFeature).mockRejectedValue(denied);
    await expect(
      requireRestaurantPlanFeature(9, "menuDesign")
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      requireRestaurantPlanFeature(9, "menuDesign")
    ).rejects.toBeInstanceOf(TRPCError);
  });

  it("fails closed when the restaurant is missing", async () => {
    vi.mocked(getRestaurantById).mockResolvedValue(undefined as never);
    await expect(
      requireRestaurantPlanFeature(99, "smartQr")
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(requireFeature).not.toHaveBeenCalled();
  });

  it("fails closed when the resolver throws", async () => {
    vi.mocked(requireFeature).mockRejectedValue(new Error("resolver unavailable"));
    await expect(
      requireRestaurantPlanFeature(9, "sessionTableManagement")
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("does not use table CRUD key for session management", async () => {
    vi.mocked(requireFeature).mockResolvedValue(undefined);
    await requireRestaurantPlanFeature(9, "sessionTableManagement");
    expect(vi.mocked(requireFeature).mock.calls[0][1]).toBe(
      "sessionTableManagement"
    );
    expect(vi.mocked(requireFeature).mock.calls[0][1]).not.toBe("smartQr");
  });
});
