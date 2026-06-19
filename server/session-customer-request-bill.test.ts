import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./diningSession/sessionService", () => ({
  requestBillByCustomer: vi.fn(),
}));

import { appRouter } from "./routers";
import { requestBillByCustomer } from "./diningSession/sessionService";

function createCaller() {
  return appRouter.createCaller({
    user: null,
    req: { headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  });
}

describe("session.requestBill UX-1E", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns public session DTO on customer bill request", async () => {
    vi.mocked(requestBillByCustomer).mockResolvedValue({
      sessionToken: "customer-session-token1234",
      status: "bill_requested",
      tableNumber: 5,
      openedAt: "2026-06-18 12:00:00",
      billRequestedAt: "2026-06-18 12:30:00",
      paymentPendingAt: null,
    });

    const caller = createCaller();
    const result = await caller.session.requestBill({
      slug: "cafe",
      sessionToken: "customer-session-token1234",
    });

    expect(result.status).toBe("bill_requested");
    expect(result).not.toHaveProperty("id");
    expect(requestBillByCustomer).toHaveBeenCalledWith({
      slug: "cafe",
      sessionToken: "customer-session-token1234",
    });
  });
});
