import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SelectDiningSession } from "../../drizzle/schema";
import { LifecycleSettlementGuardError } from "@shared/operational-session";

const repoMocks = vi.hoisted(() => ({
  findSessionById: vi.fn(),
  updateSessionStatus: vi.fn(),
  insertSessionEvent: vi.fn(),
}));

const dbMocks = vi.hoisted(() => ({
  getDb: vi.fn(),
}));

vi.mock("./sessionRepository", () => ({
  findSessionById: (...args: unknown[]) => repoMocks.findSessionById(...args),
  updateSessionStatus: (...args: unknown[]) => repoMocks.updateSessionStatus(...args),
  insertSessionEvent: (...args: unknown[]) => repoMocks.insertSessionEvent(...args),
}));

vi.mock("../db", () => ({
  getDb: (...args: unknown[]) => dbMocks.getDb(...args),
}));

const financialMocks = vi.hoisted(() => {
  const financialResult = {
    check: { id: 900, grandTotal: "50.00", taxAmount: "0.00" },
    orderSettlement: { settlements: [], events: [], outcomes: [] },
    orderSettlementEvents: [],
    settlementRecord: { record: null, events: [], outcome: "skipped" as const },
    settlementRecordEvents: [],
    settlementContext: {
      status: "unavailable",
      registerId: null,
      financialShiftId: null,
      gaps: ["test"],
    },
    settlementAttribution: {
      outcome: "skipped",
      attributionId: null,
      gaps: [],
    },
  };
  return {
    financialResult,
    confirmPayment: vi.fn(async () => financialResult),
    settleCheckComplimentaryByIdDetailed: vi.fn(async () => financialResult),
  };
});

vi.mock("../operational-session/payment/PaymentConfirmService", () => ({
  confirmPayment: (...a: unknown[]) => financialMocks.confirmPayment(...a),
}));

vi.mock("../operational-session/check/CheckService", () => ({
  createOpenCheckForSession: vi.fn(),
  ensureOpenCheckForSession: vi.fn(),
  settleCheckComplimentaryByIdDetailed: (...a: unknown[]) =>
    financialMocks.settleCheckComplimentaryByIdDetailed(...a),
}));

const guardMocks = vi.hoisted(() => ({
  assertSessionCloseable: vi.fn(),
}));

vi.mock("../operational-session/check/lifecycleSettlementGuardService", () => ({
  assertSessionCloseable: (...a: unknown[]) =>
    guardMocks.assertSessionCloseable(...a),
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
  closeSession,
  isAllowedSessionStatusTransition,
  markComplimentary,
  markPaid,
} from "./sessionService";
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

describe("session lifecycle SETTLEMENT-ARCHITECTURE-1A / LIFECYCLE-SETTLEMENT-GUARDS-1", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction();
    repoMocks.findSessionById.mockResolvedValue(baseSession);
    guardMocks.assertSessionCloseable.mockResolvedValue({
      checkId: 900,
      outcome: "paid",
    });
  });

  it("markPaid confirms Payment then closes session", async () => {
    await markPaid(actionInput);
    expect(financialMocks.confirmPayment).toHaveBeenCalledWith({
      restaurantId: 1,
      checkId: 900,
      settlements: undefined,
      settlementContextHints: {
        operatorUserId: 42,
        registerId: undefined,
        deviceId: undefined,
        operationalScreenId: undefined,
      },
    });
    expect(repoMocks.updateSessionStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "closed",
        settlementOutcome: "paid",
      }),
      expect.anything()
    );
    expect(repoMocks.insertSessionEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: TABLE_EVENT_TYPES.SESSION_PAID }),
      expect.anything()
    );
  });

  it("markPaid forwards operator tenders into confirmPayment", async () => {
    await markPaid({
      ...actionInput,
      settlements: [{ paymentMethod: "cash" }],
      registerId: "reg_1",
    });
    expect(financialMocks.confirmPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        restaurantId: 1,
        checkId: 900,
        settlements: [{ paymentMethod: "cash" }],
        settlementContextHints: expect.objectContaining({
          operatorUserId: 42,
          registerId: "reg_1",
        }),
      })
    );
  });

  it("markComplimentary settles Check then closes session", async () => {
    await markComplimentary(actionInput);
    expect(
      financialMocks.settleCheckComplimentaryByIdDetailed
    ).toHaveBeenCalled();
    expect(financialMocks.confirmPayment).not.toHaveBeenCalled();
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

  it("closeSession rejects unpaid session (SESSION_REQUIRES_SETTLEMENT)", async () => {
    guardMocks.assertSessionCloseable.mockRejectedValue(
      new LifecycleSettlementGuardError(
        "SESSION_REQUIRES_SETTLEMENT",
        "Cannot close session before settlement."
      )
    );

    await expect(closeSession(actionInput)).rejects.toMatchObject({
      code: "SESSION_REQUIRES_SETTLEMENT",
    });
    expect(repoMocks.updateSessionStatus).not.toHaveBeenCalled();
  });

  it("closeSession allows paid Check without auto-settle", async () => {
    guardMocks.assertSessionCloseable.mockResolvedValue({
      checkId: 900,
      outcome: "paid",
    });

    await closeSession(actionInput);

    expect(guardMocks.assertSessionCloseable).toHaveBeenCalledWith({
      restaurantId: 1,
      sessionId: 10,
    });
    expect(financialMocks.confirmPayment).not.toHaveBeenCalled();
    expect(repoMocks.updateSessionStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "closed",
        openGuard: null,
        settlementOutcome: "paid",
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

  it("closeSession allows complimentary Check", async () => {
    guardMocks.assertSessionCloseable.mockResolvedValue({
      checkId: 900,
      outcome: "complimentary",
    });

    await closeSession(actionInput);

    expect(repoMocks.updateSessionStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "closed",
        settlementOutcome: "complimentary",
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

    await expect(markPaid(actionInput)).rejects.toBeInstanceOf(
      DiningSessionTransitionError
    );
  });

  it("documents allowed session status transitions", () => {
    expect(isAllowedSessionStatusTransition("open", "closed")).toBe(true);
    expect(isAllowedSessionStatusTransition("paid", "closed")).toBe(true);
    expect(isAllowedSessionStatusTransition("closed", "open")).toBe(false);
  });
});
