import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SelectDiningSession } from "../../drizzle/schema";

const repoMocks = vi.hoisted(() => ({
  findSessionById: vi.fn(),
  updateSessionStatus: vi.fn(),
  insertSessionEvent: vi.fn(),
}));

const dbMocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  getOrdersBySessionId: vi.fn(),
}));

vi.mock("./sessionRepository", () => ({
  findSessionById: (...args: unknown[]) => repoMocks.findSessionById(...args),
  updateSessionStatus: (...args: unknown[]) => repoMocks.updateSessionStatus(...args),
  insertSessionEvent: (...args: unknown[]) => repoMocks.insertSessionEvent(...args),
}));

vi.mock("../db", () => ({
  getDb: (...args: unknown[]) => dbMocks.getDb(...args),
  getOrdersBySessionId: (...args: unknown[]) => dbMocks.getOrdersBySessionId(...args),
}));

import {
  cancelBillRequest,
  closeSession,
  isAllowedSessionStatusTransition,
  markPaymentPending,
  requestBill,
} from "./sessionService";
import {
  DiningSessionTransitionError,
  TABLE_EVENT_TYPES,
} from "./sessionTypes";

const baseSession: SelectDiningSession = {
  id: 10,
  restaurantId: 1,
  tableId: 5,
  tableNumber: 5,
  sessionToken: "test-dining-session-token-abc",
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

const actionInput = { restaurantId: 1, sessionId: 10, actorUserId: 42 };

function mockTransaction() {
  dbMocks.getDb.mockResolvedValue({
    transaction: async (fn: (tx: unknown) => Promise<void>) => fn({}),
  });
}

describe("session lifecycle UX-1D", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction();
    repoMocks.updateSessionStatus.mockResolvedValue(undefined);
    repoMocks.insertSessionEvent.mockResolvedValue(1);
    dbMocks.getOrdersBySessionId.mockResolvedValue([
      { id: 1, orderNumber: "ORD-1", status: "served", totalAmount: "50.00", createdAt: "x" },
    ]);
  });

  describe("isAllowedSessionStatusTransition", () => {
    it("allows approved transitions", () => {
      expect(isAllowedSessionStatusTransition("open", "bill_requested")).toBe(true);
      expect(isAllowedSessionStatusTransition("bill_requested", "open")).toBe(true);
      expect(isAllowedSessionStatusTransition("bill_requested", "payment_pending")).toBe(true);
      expect(isAllowedSessionStatusTransition("payment_pending", "closed")).toBe(true);
      expect(isAllowedSessionStatusTransition("open", "closed")).toBe(true);
    });

    it("rejects invalid transitions", () => {
      expect(isAllowedSessionStatusTransition("open", "payment_pending")).toBe(false);
      expect(isAllowedSessionStatusTransition("payment_pending", "open")).toBe(false);
      expect(isAllowedSessionStatusTransition("closed", "open")).toBe(false);
    });
  });

  it("requestBill transitions open → bill_requested and records event", async () => {
    repoMocks.findSessionById.mockResolvedValue(baseSession);

    await requestBill(actionInput);

    expect(repoMocks.updateSessionStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "bill_requested",
        billRequestedAt: expect.any(String),
      }),
      expect.anything()
    );
    expect(repoMocks.insertSessionEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: TABLE_EVENT_TYPES.BILL_REQUESTED,
        metadata: expect.objectContaining({
          source: "staff",
          actorUserId: 42,
          tableNumber: 5,
        }),
      }),
      expect.anything()
    );
  });

  it("cancelBillRequest transitions bill_requested → open without event", async () => {
    repoMocks.findSessionById.mockResolvedValue({
      ...baseSession,
      status: "bill_requested",
      billRequestedAt: "2026-06-18 12:30:00",
    });

    await cancelBillRequest(actionInput);

    expect(repoMocks.updateSessionStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "open",
        billRequestedAt: null,
      }),
      expect.anything()
    );
    expect(repoMocks.insertSessionEvent).not.toHaveBeenCalled();
  });

  it("markPaymentPending transitions bill_requested → payment_pending", async () => {
    repoMocks.findSessionById.mockResolvedValue({
      ...baseSession,
      status: "bill_requested",
    });

    await markPaymentPending(actionInput);

    expect(repoMocks.insertSessionEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: TABLE_EVENT_TYPES.PAYMENT_PENDING,
      }),
      expect.anything()
    );
  });

  it("closeSession clears openGuard and records SESSION_CLOSED", async () => {
    repoMocks.findSessionById.mockResolvedValue({
      ...baseSession,
      status: "payment_pending",
    });

    await closeSession(actionInput);

    expect(repoMocks.updateSessionStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "closed",
        openGuard: null,
        closedAt: expect.any(String),
      }),
      expect.anything()
    );
    expect(repoMocks.insertSessionEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: TABLE_EVENT_TYPES.SESSION_CLOSED,
        metadata: expect.objectContaining({
          orderCount: 1,
          ordersTotalAmount: "50.00",
        }),
      }),
      expect.anything()
    );
  });

  it("rejects actions on closed sessions", async () => {
    repoMocks.findSessionById.mockResolvedValue({
      ...baseSession,
      status: "closed",
      openGuard: null,
    });

    await expect(requestBill(actionInput)).rejects.toBeInstanceOf(
      DiningSessionTransitionError
    );
  });

  it("rejects invalid transition open → payment_pending", async () => {
    repoMocks.findSessionById.mockResolvedValue(baseSession);

    await expect(markPaymentPending(actionInput)).rejects.toBeInstanceOf(
      DiningSessionTransitionError
    );
  });

  it("rejects cross-tenant session", async () => {
    repoMocks.findSessionById.mockResolvedValue({
      ...baseSession,
      restaurantId: 999,
    });

    await expect(requestBill(actionInput)).rejects.toThrow(/not found/i);
  });
});
