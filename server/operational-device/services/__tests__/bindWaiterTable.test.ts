/**
 * WAITER-ATTACH-MUST-NOT-OPEN-SESSION-1
 * Table attach binds restaurant + table only. CLOSED tables do not write Session.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";

const mocks = vi.hoisted(() => ({
  getTableById: vi.fn(),
  getActiveSession: vi.fn(),
}));

vi.mock("../../../db", () => ({
  getTableById: mocks.getTableById,
}));

vi.mock("../../../diningSession/sessionService", () => ({
  getActiveSession: mocks.getActiveSession,
}));

import { bindWaiterTable } from "../bindWaiterTable";

const table = {
  id: 7,
  restaurantId: 1,
  tableNumber: 5,
  isActive: true,
};

const openSession = {
  id: 10,
  restaurantId: 1,
  tableId: 7,
  tableNumber: 5,
  sessionToken: "open-session-token1",
  status: "open" as const,
};

describe("bindWaiterTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getTableById.mockResolvedValue(table);
    mocks.getActiveSession.mockResolvedValue(null);
  });

  it("binds a closed table without creating a Session", async () => {
    const result = await bindWaiterTable({
      restaurantId: 1,
      tableId: 7,
      tableNumber: 5,
    });

    expect(result).toEqual({
      restaurantId: 1,
      tableId: 7,
      tableNumber: 5,
      sessionId: null,
      sessionToken: null,
      sessionStatus: null,
      created: false,
      persistence: "persistent",
    });
    expect(mocks.getActiveSession).toHaveBeenCalledWith({
      restaurantId: 1,
      tableId: 7,
    });
  });

  it("reads an already-open Session and does not claim created", async () => {
    mocks.getActiveSession.mockResolvedValue(openSession);

    const result = await bindWaiterTable({
      restaurantId: 1,
      tableId: 7,
      tableNumber: 5,
    });

    expect(result.sessionId).toBe(10);
    expect(result.sessionToken).toBe("open-session-token1");
    expect(result.sessionStatus).toBe("open");
    expect(result.created).toBe(false);
  });

  it("rejects a table that does not belong to the restaurant", async () => {
    mocks.getTableById.mockResolvedValue({
      ...table,
      restaurantId: 99,
    });

    await expect(
      bindWaiterTable({ restaurantId: 1, tableId: 7, tableNumber: 5 })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
    } satisfies Partial<TRPCError>);
    expect(mocks.getActiveSession).not.toHaveBeenCalled();
  });

  it("rejects a tableNumber mismatch", async () => {
    await expect(
      bindWaiterTable({ restaurantId: 1, tableId: 7, tableNumber: 99 })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.getActiveSession).not.toHaveBeenCalled();
  });
});
