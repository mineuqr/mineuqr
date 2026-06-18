import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import type { SelectDiningSession } from "../drizzle/schema";

vi.mock("./db", () => ({
  getRestaurantBySlug: vi.fn(),
  getTableByRestaurantAndNumber: vi.fn(),
}));

vi.mock("./diningSession/sessionRepository", () => ({
  findActiveSession: vi.fn(),
  findSessionByToken: vi.fn(),
}));

import { appRouter } from "./routers";
import { getRestaurantBySlug, getTableByRestaurantAndNumber } from "./db";
import { findActiveSession, findSessionByToken } from "./diningSession/sessionRepository";

const baseRow: SelectDiningSession = {
  id: 99,
  restaurantId: 1,
  tableId: 7,
  tableNumber: 3,
  sessionToken: "public-session-token1234",
  status: "open",
  openGuard: 1,
  openedAt: "2026-06-18 12:00:00",
  billRequestedAt: null,
  paymentPendingAt: null,
  closedAt: null,
  totalAmount: null,
  totalOrders: 1,
  createdAt: "2026-06-18 12:00:00",
  updatedAt: "2026-06-18 12:00:00",
};

function createCaller() {
  return appRouter.createCaller({
    user: null,
    req: { headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  });
}

describe("session public recovery APIs TABLE-MANAGEMENT-1 D4", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRestaurantBySlug).mockResolvedValue({
      id: 1,
      isActive: true,
    } as Awaited<ReturnType<typeof getRestaurantBySlug>>);
    vi.mocked(getTableByRestaurantAndNumber).mockResolvedValue({
      id: 7,
      tableNumber: 3,
      isActive: true,
    } as Awaited<ReturnType<typeof getTableByRestaurantAndNumber>>);
  });

  it("getActiveByTable returns customer-safe DTO without internal ids", async () => {
    vi.mocked(findActiveSession).mockResolvedValue(baseRow);

    const caller = createCaller();
    const result = await caller.session.getActiveByTable({
      slug: "cafe",
      tableNumber: 3,
    });

    expect(result).toEqual({
      sessionToken: "public-session-token1234",
      status: "open",
      tableNumber: 3,
      openedAt: "2026-06-18 12:00:00",
      billRequestedAt: null,
      paymentPendingAt: null,
    });
    expect(result).not.toHaveProperty("id");
    expect(result).not.toHaveProperty("restaurantId");
    expect(result).not.toHaveProperty("openGuard");
  });

  it("getActiveByTable returns null when no active session", async () => {
    vi.mocked(findActiveSession).mockResolvedValue(null);

    const caller = createCaller();
    const result = await caller.session.getActiveByTable({
      slug: "cafe",
      tableNumber: 3,
    });

    expect(result).toBeNull();
  });

  it("getByToken returns customer-safe session", async () => {
    vi.mocked(findSessionByToken).mockResolvedValue({
      ...baseRow,
      status: "bill_requested",
      billRequestedAt: "2026-06-18 13:00:00",
    });

    const caller = createCaller();
    const result = await caller.session.getByToken({
      slug: "cafe",
      sessionToken: "public-session-token1234",
    });

    expect(result).toMatchObject({
      sessionToken: "public-session-token1234",
      status: "bill_requested",
      tableNumber: 3,
      billRequestedAt: "2026-06-18 13:00:00",
    });
    expect(result).not.toHaveProperty("id");
  });

  it("getByToken returns null for invalid token format", async () => {
    const caller = createCaller();

    await expect(
      caller.session.getByToken({
        slug: "cafe",
        sessionToken: "short",
      })
    ).rejects.toThrow();
  });

  it("getByToken returns null when restaurant inactive", async () => {
    vi.mocked(getRestaurantBySlug).mockResolvedValue({
      id: 1,
      isActive: false,
    } as Awaited<ReturnType<typeof getRestaurantBySlug>>);

    const caller = createCaller();
    const result = await caller.session.getByToken({
      slug: "cafe",
      sessionToken: "public-session-token1234",
    });

    expect(result).toBeNull();
    expect(findSessionByToken).not.toHaveBeenCalled();
  });
});
