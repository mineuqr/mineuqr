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

vi.mock("../operational-session/check/CheckService", () => ({
  createOpenCheckForSession: vi.fn(),
  settleCheckPaid: vi.fn(async () => ({
    id: 900,
    grandTotal: "50.00",
    taxAmount: "0.00",
  })),
  settleCheckComplimentary: vi.fn(async () => ({
    id: 900,
    grandTotal: "50.00",
    taxAmount: "0.00",
  })),
  voidCheck: vi.fn(async () => ({ id: 900 })),
}));

import {
  closeSession,
  isAllowedSessionStatusTransition,
  markComplimentary,
  markPaid,
} from "./sessionService";
import { settleCheckPaid } from "../operational-session/check/CheckService";
import { DiningSessionTransitionError, TABLE_EVENT_TYPES } from "./sessionTypes";

const baseSession: SelectDiningSession = {
  id: 10,
  restaurantId: 1,
  tableId: 5,
  tableNumber: 5,
  sessionToken: "test-dining-session-token-abc",
  status: "open",
  openGuard: 1,
  openedAt: "2026-06-18 12:00:00",
  settledAt: null,
  settlementOutcome: null,
  closedAt: null,
  totalAmount: null,
  totalOrders: 0,
  activeCheckId: 900,
  createdAt: "2026-06-18 12:00:00",
  updatedAt: "2026-06-18 12:00:00",
};

const actionInput = { restaurantId: 1, sessionId: 10, actorUserId: 42 };

function mockTransaction() {
  dbMocks.getDb.mockResolvedValue({
    transaction: async (fn: (tx: unknown) => Promise<void>) => fn({}),
  });
}

describe("session lifecycle SETTLEMENT-ARCHITECTURE-1A", () => {
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
      expect(isAllowedSessionStatusTransition("open", "paid")).toBe(true);
      expect(isAllowedSessionStatusTransition("open", "complimentary")).toBe(true);
      expect(isAllowedSessionStatusTransition("open", "closed")).toBe(true);
      expect(isAllowedSessionStatusTransition("paid", "closed")).toBe(true);
      expect(isAllowedSessionStatusTransition("complimentary", "closed")).toBe(true);
    });

    it("rejects invalid transitions", () => {
      expect(isAllowedSessionStatusTransition("open", "open")).toBe(false);
      expect(isAllowedSessionStatusTransition("closed", "open")).toBe(false);
      expect(isAllowedSessionStatusTransition("paid", "open")).toBe(false);
    });
  });

  it("markPaid settles and auto-closes session", async () => {
    repoMocks.findSessionById.mockResolvedValue(baseSession);

    await markPaid(actionInput);

    expect(settleCheckPaid).toHaveBeenCalledWith(
      expect.objectContaining({
        restaurantId: 1,
        sessionId: 10,
        settlements: undefined,
      })
    );
    expect(repoMocks.updateSessionStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "paid",
        settlementOutcome: "paid",
        settledAt: expect.any(String),
      }),
      expect.anything()
    );
    expect(repoMocks.insertSessionEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: TABLE_EVENT_TYPES.SESSION_PAID }),
      expect.anything()
    );
    expect(repoMocks.updateSessionStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "closed",
        openGuard: null,
        settlementOutcome: "paid",
      }),
      expect.anything()
    );
    expect(repoMocks.insertSessionEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: TABLE_EVENT_TYPES.SESSION_CLOSED }),
      expect.anything()
    );
  });

  it("markPaid forwards operator settlements to Check settle", async () => {
    repoMocks.findSessionById.mockResolvedValue(baseSession);

    await markPaid({
      ...actionInput,
      settlements: [{ paymentMethod: "mada" }],
    });

    expect(settleCheckPaid).toHaveBeenCalledWith({
      restaurantId: 1,
      sessionId: 10,
      settlements: [{ paymentMethod: "mada" }],
    });
  });

  it("markComplimentary settles and auto-closes session", async () => {
    repoMocks.findSessionById.mockResolvedValue(baseSession);

    await markComplimentary(actionInput);

    expect(repoMocks.insertSessionEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: TABLE_EVENT_TYPES.SESSION_COMPLIMENTARY }),
      expect.anything()
    );
    expect(repoMocks.updateSessionStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "closed",
        settlementOutcome: "complimentary",
      }),
      expect.anything()
    );
  });

  it("closeSession clears openGuard without settlement", async () => {
    repoMocks.findSessionById.mockResolvedValue(baseSession);

    await closeSession(actionInput);

    expect(repoMocks.updateSessionStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "closed",
        openGuard: null,
        settlementOutcome: null,
        settledAt: null,
      }),
      expect.anything()
    );
    expect(repoMocks.insertSessionEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: TABLE_EVENT_TYPES.SESSION_CLOSED,
        metadata: expect.objectContaining({ source: "manual_close" }),
      }),
      expect.anything()
    );
  });

  it("rejects settlement on closed sessions", async () => {
    repoMocks.findSessionById.mockResolvedValue({
      ...baseSession,
      status: "closed",
      openGuard: null,
    });

    await expect(markPaid(actionInput)).rejects.toBeInstanceOf(DiningSessionTransitionError);
  });
});
