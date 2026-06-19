import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { TABLE_EVENT_TYPES } from "./diningSession/sessionTypes";

vi.mock("./restaurantAccess", () => ({
  assertRestaurantAccess: vi.fn(),
}));

vi.mock("./diningSession/sessionService", () => ({
  requestBill: vi.fn(),
  cancelBillRequest: vi.fn(),
  markPaymentPending: vi.fn(),
  closeSession: vi.fn(),
}));

vi.mock("./diningSession/sessionOwnerWorkspace", () => ({
  getOwnerSessionWorkspace: vi.fn(),
}));

import { appRouter } from "./routers";
import { assertRestaurantAccess } from "./restaurantAccess";
import {
  requestBill,
  cancelBillRequest,
  markPaymentPending,
  closeSession,
} from "./diningSession/sessionService";
import { getOwnerSessionWorkspace } from "./diningSession/sessionOwnerWorkspace";

const workspacePayload = {
  sessionId: 1,
  tableNumber: 5,
  status: "bill_requested" as const,
  openedAt: "2026-06-18 21:42:00",
  closedAt: null,
  orderCount: 2,
  ordersTotalAmount: "165.00",
  orders: [],
  events: [{ id: 1, eventType: TABLE_EVENT_TYPES.BILL_REQUESTED, createdAt: "x", orderId: null, orderNumber: null, totalAmount: null }],
};

function createVerifiedCaller(userId = 7) {
  return appRouter.createCaller({
    user: {
      id: userId,
      openId: "user-7",
      role: "user",
      emailVerifiedAt: new Date().toISOString(),
      loginMethod: "local",
    },
    req: { headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  });
}

describe("session action mutations UX-1D", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assertRestaurantAccess).mockResolvedValue(undefined);
    vi.mocked(getOwnerSessionWorkspace).mockResolvedValue(workspacePayload);
  });

  it("staffRequestBill returns updated workspace", async () => {
    const caller = createVerifiedCaller();
    const result = await caller.session.staffRequestBill({
      restaurantId: 10,
      sessionId: 1,
    });

    expect(requestBill).toHaveBeenCalledWith({
      restaurantId: 10,
      sessionId: 1,
      actorUserId: 7,
    });
    expect(result.status).toBe("bill_requested");
  });

  it("close mutation returns updated workspace", async () => {
    vi.mocked(getOwnerSessionWorkspace).mockResolvedValue({
      ...workspacePayload,
      status: "closed",
      closedAt: "2026-06-18 22:00:00",
    });

    const caller = createVerifiedCaller();
    const result = await caller.session.close({ restaurantId: 10, sessionId: 1 });

    expect(closeSession).toHaveBeenCalledWith({
      restaurantId: 10,
      sessionId: 1,
      actorUserId: 7,
    });
    expect(result.status).toBe("closed");
  });

  it("cancelBillRequest and markPaymentPending wire actorUserId", async () => {
    const caller = createVerifiedCaller(99);
    await caller.session.cancelBillRequest({ restaurantId: 10, sessionId: 1 });
    await caller.session.markPaymentPending({ restaurantId: 10, sessionId: 1 });

    expect(cancelBillRequest).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: 99 })
    );
    expect(markPaymentPending).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: 99 })
    );
  });
});
