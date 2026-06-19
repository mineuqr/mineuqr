import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";

vi.mock("../restaurantAccess", () => ({
  assertRestaurantAccess: vi.fn(),
}));

vi.mock("./restaurantOverview", () => ({
  getRestaurantOverview: vi.fn(),
}));

import { assertRestaurantAccess } from "../restaurantAccess";
import { appRouter } from "../routers";
import { getRestaurantOverview } from "./restaurantOverview";

function createVerifiedCaller() {
  return appRouter.createCaller({
    user: {
      id: 1,
      openId: "owner-1",
      role: "user",
      emailVerifiedAt: new Date(),
    } as TrpcContext["user"],
    req: { headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  });
}

describe("ops.getRestaurantOverview OPS-DASHBOARD-2B.1", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assertRestaurantAccess).mockResolvedValue(undefined);
    vi.mocked(getRestaurantOverview).mockResolvedValue({
      activeSessions: 2,
      occupiedTables: 2,
      pendingOrders: 5,
      billRequests: 1,
    });
  });

  it("returns overview metrics for authorized restaurant", async () => {
    const caller = createVerifiedCaller();
    const result = await caller.ops.getRestaurantOverview({ restaurantId: 42 });

    expect(assertRestaurantAccess).toHaveBeenCalledWith(
      expect.objectContaining({ user: expect.objectContaining({ id: 1 }) }),
      42,
      "ops.getRestaurantOverview"
    );
    expect(getRestaurantOverview).toHaveBeenCalledWith(42);
    expect(result).toEqual({
      activeSessions: 2,
      occupiedTables: 2,
      pendingOrders: 5,
      billRequests: 1,
    });
  });

  it("coerces numeric string restaurantId", async () => {
    const caller = createVerifiedCaller();
    await caller.ops.getRestaurantOverview({
      restaurantId: "42" as unknown as number,
    });

    expect(getRestaurantOverview).toHaveBeenCalledWith(42);
  });
});
