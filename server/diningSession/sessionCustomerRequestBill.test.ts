import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SelectDiningSession } from "../../drizzle/schema";

const repoMocks = vi.hoisted(() => ({
  findSessionById: vi.fn(),
  findSessionByToken: vi.fn(),
  updateSessionStatus: vi.fn(),
  insertSessionEvent: vi.fn(),
}));

const dbMocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  getRestaurantBySlug: vi.fn(),
}));

vi.mock("./sessionRepository", () => ({
  findSessionById: (...args: unknown[]) => repoMocks.findSessionById(...args),
  findSessionByToken: (...args: unknown[]) => repoMocks.findSessionByToken(...args),
  updateSessionStatus: (...args: unknown[]) => repoMocks.updateSessionStatus(...args),
  insertSessionEvent: (...args: unknown[]) => repoMocks.insertSessionEvent(...args),
}));

vi.mock("../db", () => ({
  getDb: (...args: unknown[]) => dbMocks.getDb(...args),
  getRestaurantBySlug: (...args: unknown[]) => dbMocks.getRestaurantBySlug(...args),
}));

import { requestBillByCustomer } from "./sessionService";
import {
  DiningSessionNotFoundError,
  DiningSessionTransitionError,
  TABLE_EVENT_TYPES,
} from "./sessionTypes";

const token = "customer-session-token1234";

const baseSession: SelectDiningSession = {
  id: 10,
  restaurantId: 1,
  tableId: 5,
  tableNumber: 5,
  sessionToken: token,
  status: "open",
  openGuard: 1,
  openedAt: "2026-06-18 12:00:00",
  billRequestedAt: null,
  paymentPendingAt: null,
  closedAt: null,
  totalAmount: null,
  totalOrders: 0,
  createdAt: "2026-06-18 12:00:00",
  updatedAt: "2026-06-18 12:00:00",
};

function mockTransaction() {
  dbMocks.getDb.mockResolvedValue({
    transaction: async (fn: (tx: unknown) => Promise<void>) => fn({}),
  });
}

describe("requestBillByCustomer UX-1E", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction();
    dbMocks.getRestaurantBySlug.mockResolvedValue({ id: 1, isActive: true });
    repoMocks.findSessionByToken.mockResolvedValue(baseSession);
    repoMocks.updateSessionStatus.mockResolvedValue(undefined);
    repoMocks.insertSessionEvent.mockResolvedValue(1);
  });

  it("transitions open → bill_requested and records customer event", async () => {
    repoMocks.findSessionById.mockResolvedValue({
      ...baseSession,
      status: "bill_requested",
      billRequestedAt: "2026-06-18 12:30:00",
    });

    const result = await requestBillByCustomer({ slug: "cafe", sessionToken: token });

    expect(result.status).toBe("bill_requested");
    expect(repoMocks.insertSessionEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: TABLE_EVENT_TYPES.BILL_REQUESTED,
        metadata: expect.objectContaining({ source: "customer", tableNumber: 5 }),
      }),
      expect.anything()
    );
  });

  it("is idempotent when already bill_requested", async () => {
    repoMocks.findSessionByToken.mockResolvedValue({
      ...baseSession,
      status: "bill_requested",
      billRequestedAt: "2026-06-18 12:30:00",
    });

    const result = await requestBillByCustomer({ slug: "cafe", sessionToken: token });

    expect(result.status).toBe("bill_requested");
    expect(repoMocks.insertSessionEvent).not.toHaveBeenCalled();
    expect(repoMocks.updateSessionStatus).not.toHaveBeenCalled();
  });

  it("rejects payment_pending sessions", async () => {
    repoMocks.findSessionByToken.mockResolvedValue({
      ...baseSession,
      status: "payment_pending",
    });

    await expect(
      requestBillByCustomer({ slug: "cafe", sessionToken: token })
    ).rejects.toBeInstanceOf(DiningSessionTransitionError);
  });

  it("rejects closed sessions", async () => {
    repoMocks.findSessionByToken.mockResolvedValue({
      ...baseSession,
      status: "closed",
      openGuard: null,
    });

    await expect(
      requestBillByCustomer({ slug: "cafe", sessionToken: token })
    ).rejects.toBeInstanceOf(DiningSessionTransitionError);
  });

  it("rejects unknown session token", async () => {
    repoMocks.findSessionByToken.mockResolvedValue(null);

    await expect(
      requestBillByCustomer({ slug: "cafe", sessionToken: token })
    ).rejects.toBeInstanceOf(DiningSessionNotFoundError);
  });
});
