import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SelectDiningSession } from "../../drizzle/schema";

const repoMocks = vi.hoisted(() => ({
  findActiveSession: vi.fn(),
  findSessionById: vi.fn(),
  findSessionByToken: vi.fn(),
  insertSession: vi.fn(),
  insertSessionEvent: vi.fn(),
}));

const dbMocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  getRestaurantById: vi.fn(),
  getTableById: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("./sessionRepository", () => ({
  findActiveSession: (...args: unknown[]) => repoMocks.findActiveSession(...args),
  findSessionById: (...args: unknown[]) => repoMocks.findSessionById(...args),
  findSessionByToken: (...args: unknown[]) => repoMocks.findSessionByToken(...args),
  insertSession: (...args: unknown[]) => repoMocks.insertSession(...args),
  insertSessionEvent: (...args: unknown[]) => repoMocks.insertSessionEvent(...args),
}));

vi.mock("../db", () => ({
  getDb: (...args: unknown[]) => dbMocks.getDb(...args),
  getRestaurantById: (...args: unknown[]) => dbMocks.getRestaurantById(...args),
  getTableById: (...args: unknown[]) => dbMocks.getTableById(...args),
}));

vi.mock("./sessionToken", () => ({
  generateDiningSessionToken: vi.fn(() => "test-dining-session-token-abc"),
}));

vi.mock("../operational-session/check/CheckService", () => ({
  createOpenCheckForSession: vi.fn(async () => ({
    id: 900,
    restaurantId: 1,
    sessionId: 10,
    outcome: "open",
  })),
  ensureOpenCheckForSession: vi.fn(),
  settleCheckComplimentaryByIdDetailed: vi.fn(),
  voidCheckByIdDetailed: vi.fn(),
}));

vi.mock("../operational-session/payment/PaymentConfirmService", () => ({
  confirmPayment: vi.fn(),
}));

vi.mock("../operational-session/check/api/orderSettlementReadComposition", () => ({
  getOrderSettlementProjectionStore: vi.fn(() => ({})),
}));

vi.mock(
  "../operational-session/check/read/orderSettlementProjectionMaterializer",
  () => ({
    tryMaterializeOrderSettlementProjections: vi.fn(async () => null),
  })
);

import {
  getActiveSession,
  getOrCreateSession,
  resolveSessionForOrderCreate,
  recordSessionEvent,
} from "./sessionService";
import {
  DiningSessionConflictError,
  DiningSessionExpiredError,
  DiningSessionNotFoundError,
  DiningSessionValidationError,
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
  settledAt: null,
  settlementOutcome: null,
  closedAt: null,
  totalAmount: null,
  totalOrders: 0,
  activeCheckId: 900,
  createdAt: "2026-06-18 12:00:00",
  updatedAt: "2026-06-18 12:00:00",
};

function mockValidRestaurantAndTable() {
  dbMocks.getRestaurantById.mockResolvedValue({
    id: 1,
    isActive: true,
  });
  dbMocks.getTableById.mockResolvedValue({
    id: 5,
    restaurantId: 1,
    tableNumber: 5,
    isActive: true,
  });
}

describe("sessionService TABLE-MANAGEMENT-1 D2", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidRestaurantAndTable();
    dbMocks.getDb.mockResolvedValue({
      transaction: dbMocks.transaction,
    });
    dbMocks.transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<number>) => fn({})
    );
    repoMocks.insertSession.mockResolvedValue(10);
    repoMocks.insertSessionEvent.mockResolvedValue(100);
    repoMocks.findSessionById.mockResolvedValue(baseSession);
  });

  describe("getActiveSession", () => {
    it("returns active session when found", async () => {
      repoMocks.findActiveSession.mockResolvedValue(baseSession);

      const result = await getActiveSession({ restaurantId: 1, tableId: 5 });

      expect(result).toEqual(baseSession);
      expect(repoMocks.findActiveSession).toHaveBeenCalledWith(1, 5);
    });

    it("returns null when no active session", async () => {
      repoMocks.findActiveSession.mockResolvedValue(null);

      const result = await getActiveSession({ restaurantId: 1, tableId: 5 });

      expect(result).toBeNull();
    });
  });

  describe("getOrCreateSession", () => {
    it("creates a new session when none exists", async () => {
      repoMocks.findActiveSession.mockResolvedValueOnce(null);

      const result = await getOrCreateSession({
        restaurantId: 1,
        tableId: 5,
        tableNumber: 5,
      });

      expect(result.created).toBe(true);
      expect(result.session).toEqual(baseSession);
      expect(repoMocks.insertSession).toHaveBeenCalledWith(
        expect.objectContaining({
          restaurantId: 1,
          tableId: 5,
          tableNumber: 5,
          sessionToken: "test-dining-session-token-abc",
        }),
        expect.anything()
      );
      expect(repoMocks.insertSessionEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 10,
          eventType: TABLE_EVENT_TYPES.SESSION_OPENED,
        }),
        expect.anything()
      );
    });

    it("reuses existing active session without creating", async () => {
      repoMocks.findActiveSession.mockResolvedValue(baseSession);

      const result = await getOrCreateSession({
        restaurantId: 1,
        tableId: 5,
        tableNumber: 5,
      });

      expect(result).toEqual({ session: baseSession, created: false });
      expect(repoMocks.insertSession).not.toHaveBeenCalled();
    });

    it("recovers from duplicate session race by returning winner session", async () => {
      repoMocks.findActiveSession
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(baseSession);
      repoMocks.insertSession.mockRejectedValueOnce({ code: "ER_DUP_ENTRY", errno: 1062 });

      const result = await getOrCreateSession({
        restaurantId: 1,
        tableId: 5,
        tableNumber: 5,
      });

      expect(result).toEqual({ session: baseSession, created: false });
    });

    it("recovers from DiningSessionConflictError by returning winner session", async () => {
      repoMocks.findActiveSession
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(baseSession);
      dbMocks.transaction.mockRejectedValueOnce(new DiningSessionConflictError());

      const result = await getOrCreateSession({
        restaurantId: 1,
        tableId: 5,
        tableNumber: 5,
      });

      expect(result).toEqual({ session: baseSession, created: false });
    });

    it("rejects invalid table context", async () => {
      dbMocks.getTableById.mockResolvedValue({
        id: 5,
        restaurantId: 1,
        tableNumber: 99,
        isActive: true,
      });

      await expect(
        getOrCreateSession({ restaurantId: 1, tableId: 5, tableNumber: 5 })
      ).rejects.toBeInstanceOf(DiningSessionValidationError);
    });
  });

  describe("recordSessionEvent", () => {
    it("records ORDER_CREATED with orderId", async () => {
      repoMocks.findSessionById.mockResolvedValue(baseSession);
      repoMocks.insertSessionEvent.mockResolvedValue(200);

      const result = await recordSessionEvent({
        restaurantId: 1,
        tableId: 5,
        sessionId: 10,
        orderId: 42,
        eventType: TABLE_EVENT_TYPES.ORDER_CREATED,
        metadata: { orderNumber: "ORD-0042" },
      });

      expect(result).toEqual({ eventId: 200 });
      expect(repoMocks.insertSessionEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: TABLE_EVENT_TYPES.ORDER_CREATED,
          orderId: 42,
        })
      );
    });

    it("rejects ORDER_CREATED without orderId", async () => {
      repoMocks.findSessionById.mockResolvedValue(baseSession);

      await expect(
        recordSessionEvent({
          restaurantId: 1,
          tableId: 5,
          sessionId: 10,
          eventType: TABLE_EVENT_TYPES.ORDER_CREATED,
        })
      ).rejects.toBeInstanceOf(DiningSessionValidationError);
    });

    it("rejects unknown event types", async () => {
      await expect(
        recordSessionEvent({
          restaurantId: 1,
          tableId: 5,
          sessionId: 10,
          eventType: "UNKNOWN_EVENT" as "ORDER_CREATED",
        })
      ).rejects.toBeInstanceOf(DiningSessionValidationError);
    });

    it("throws when session not found", async () => {
      repoMocks.findSessionById.mockResolvedValue(null);

      await expect(
        recordSessionEvent({
          restaurantId: 1,
          tableId: 5,
          sessionId: 10,
          eventType: TABLE_EVENT_TYPES.SESSION_OPENED,
        })
      ).rejects.toBeInstanceOf(DiningSessionNotFoundError);
    });
  });

  describe("resolveSessionForOrderCreate CUSTOMER-SESSION-LIFECYCLE-1F", () => {
    it("reuses active open session without creating", async () => {
      repoMocks.findActiveSession.mockResolvedValue(baseSession);

      const result = await resolveSessionForOrderCreate({
        restaurantId: 1,
        tableId: 5,
        tableNumber: 5,
        sessionToken: "closed-token123456789",
      });

      expect(result.created).toBe(false);
      expect(result.session).toEqual(baseSession);
      expect(repoMocks.insertSession).not.toHaveBeenCalled();
    });

    it("rejects terminal hinted session token", async () => {
      repoMocks.findActiveSession.mockResolvedValueOnce(null);
      repoMocks.findSessionByToken.mockResolvedValue({
        ...baseSession,
        status: "closed",
        openGuard: null,
      });

      await expect(
        resolveSessionForOrderCreate({
          restaurantId: 1,
          tableId: 5,
          tableNumber: 5,
          sessionToken: "closed-token123456789",
        })
      ).rejects.toBeInstanceOf(DiningSessionExpiredError);
    });

    it("creates session when no active session and no terminal hint", async () => {
      repoMocks.findActiveSession
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      repoMocks.insertSession.mockResolvedValue(10);
      repoMocks.findSessionById.mockResolvedValue(baseSession);

      const result = await resolveSessionForOrderCreate({
        restaurantId: 1,
        tableId: 5,
        tableNumber: 5,
      });

      expect(result.created).toBe(true);
      expect(repoMocks.insertSession).toHaveBeenCalled();
    });
  });
});
