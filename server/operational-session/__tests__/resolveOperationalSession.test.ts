import { describe, expect, it, vi, beforeEach } from "vitest";
import { createTableSessionAnchor } from "@shared/operational-session";
import { resolveOperationalSession } from "../resolveOperationalSession";
import * as diningSessionService from "../../diningSession/sessionService";

vi.mock("../../diningSession/sessionService", () => ({
  resolveSessionForOrderCreate: vi.fn(),
}));

const diningRow = {
  id: 10,
  restaurantId: 1,
  tableId: 7,
  tableNumber: 3,
  sessionToken: "sess-tok",
  status: "open" as const,
  openGuard: 1,
  openedAt: "2026-06-18 12:00:00",
  settledAt: null,
  settlementOutcome: null,
  closedAt: null,
  totalAmount: null,
  totalOrders: 0,
  activeCheckId: null,
  createdAt: "2026-06-18 12:00:00",
  updatedAt: "2026-06-18 12:00:00",
};

describe("OPERATIONAL-SESSION-PLATFORM-1 resolveOperationalSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(diningSessionService.resolveSessionForOrderCreate).mockResolvedValue({
      session: diningRow,
      created: true,
    });
  });

  it("resolves table anchor via Dining Session adapter", async () => {
    const result = await resolveOperationalSession({
      restaurantId: 1,
      anchor: createTableSessionAnchor({ tableId: 7, tableNumber: 3 }),
      sessionToken: "hint",
    });

    expect(diningSessionService.resolveSessionForOrderCreate).toHaveBeenCalledWith(
      {
        restaurantId: 1,
        tableId: 7,
        tableNumber: 3,
        sessionToken: "hint",
        tableContext: undefined,
      },
      // No caller transaction: this resolution is not on an Order persist.
      undefined
    );
    expect(result.created).toBe(true);
    expect(result.persistence).toBe("persistent");
    expect(result.session?.id).toBe(10);
    expect(result.session?.anchor.anchorType).toBe("table");
    if (result.session?.anchor.anchorType === "table") {
      expect(result.session.anchor.tableId).toBe(7);
    }
  });

  it("resolves non-table anchors ephemerally without Dining Session", async () => {
    const result = await resolveOperationalSession({
      restaurantId: 1,
      anchor: {
        anchorType: "station",
        identity: "station-1",
        stationId: "station-1",
      },
    });

    expect(result).toEqual({
      session: null,
      created: false,
      persistence: "ephemeral",
    });
    expect(diningSessionService.resolveSessionForOrderCreate).not.toHaveBeenCalled();
  });

  it("resolves pickup_point / queue / drive_lane ephemerally", async () => {
    for (const anchor of [
      {
        anchorType: "pickup_point" as const,
        identity: "p1",
        pickupPointId: "p1",
      },
      { anchorType: "queue" as const, identity: "q1", queueId: "q1" },
      { anchorType: "drive_lane" as const, identity: "L1", laneId: "L1" },
    ]) {
      const result = await resolveOperationalSession({
        restaurantId: 1,
        anchor,
      });
      expect(result.persistence).toBe("ephemeral");
      expect(result.session).toBeNull();
    }
    expect(diningSessionService.resolveSessionForOrderCreate).not.toHaveBeenCalled();
  });
});
