/**
 * COMMERCIAL-ENTITLEMENT-ENFORCEMENT-REPAIR-1
 * Order: restaurant access, then commercial devices entitlement.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";

vi.mock("../../../restaurantAccess", () => ({
  assertRestaurantAccess: vi.fn(),
}));

vi.mock("../requireDevicesFeature", () => ({
  requireDevicesFeature: vi.fn(),
}));

import { assertRestaurantAccess } from "../../../restaurantAccess";
import { requireDevicesFeature } from "../requireDevicesFeature";
import { assertDeviceManagementAccess } from "../assertDeviceManagementAccess";

const ctx = { user: { id: 9, role: "user" } } as never;

describe("assertDeviceManagementAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assertRestaurantAccess).mockResolvedValue(undefined);
    vi.mocked(requireDevicesFeature).mockResolvedValue(undefined);
  });

  it("checks restaurant access before commercial entitlement", async () => {
    const order: string[] = [];
    vi.mocked(assertRestaurantAccess).mockImplementation(async () => {
      order.push("restaurant");
    });
    vi.mocked(requireDevicesFeature).mockImplementation(async () => {
      order.push("devices");
    });

    await assertDeviceManagementAccess(ctx, 44, "operationalDevice.management.create");

    expect(order).toEqual(["restaurant", "devices"]);
    expect(assertRestaurantAccess).toHaveBeenCalledWith(
      ctx,
      44,
      "operationalDevice.management.create"
    );
    expect(requireDevicesFeature).toHaveBeenCalledWith(9, undefined);
  });

  it("does not consult devices when restaurant access is denied", async () => {
    vi.mocked(assertRestaurantAccess).mockRejectedValue(
      new TRPCError({ code: "FORBIDDEN", message: "غير مصرح بالوصول" })
    );

    await expect(
      assertDeviceManagementAccess(ctx, 44, "operationalDevice.management.create")
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(requireDevicesFeature).not.toHaveBeenCalled();
  });

  it("denies restaurant owner without devices", async () => {
    vi.mocked(requireDevicesFeature).mockRejectedValue(
      new TRPCError({ code: "FORBIDDEN", message: "غير مصرح بالوصول" })
    );

    await expect(
      assertDeviceManagementAccess(ctx, 44, "operationalDevice.management.create")
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("denies admin role without devices (RBAC is not entitlement)", async () => {
    const adminCtx = { user: { id: 2, role: "admin" } } as never;
    vi.mocked(requireDevicesFeature).mockRejectedValue(
      new TRPCError({ code: "FORBIDDEN", message: "غير مصرح بالوصول" })
    );

    await expect(
      assertDeviceManagementAccess(adminCtx, 44, "operationalDevice.management.create")
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(requireDevicesFeature).toHaveBeenCalledWith(2, undefined);
  });
});
