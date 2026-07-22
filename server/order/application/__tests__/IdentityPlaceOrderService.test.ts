import { beforeEach, describe, expect, it, vi } from "vitest";
import { createStationFulfilmentAnchor } from "@shared/ordering-platform/orderingIdentityContract";
import { LEGACY_NON_TABLE_TABLE_ID } from "@shared/ordering-platform/orderingIdentityContract";
import { IdentityPlaceOrderService } from "../IdentityPlaceOrderService";
import type { PlaceOrderService } from "../PlaceOrderService";
import * as operationalSession from "../../../operational-session";

vi.mock("../../../operational-session", () => ({
  resolveOperationalSession: vi.fn(),
  ensureCheckForOrder: vi.fn(),
}));

vi.mock("../../../_core/opsLog", () => ({
  opsLog: vi.fn(),
}));

describe("NON-TABLE-PLACE-ORDER-1 IdentityPlaceOrderService", () => {
  const execute = vi.fn();
  const placeOrder = { execute } as unknown as PlaceOrderService;
  const service = new IdentityPlaceOrderService(placeOrder);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(operationalSession.resolveOperationalSession).mockResolvedValue({
      session: null,
      created: false,
      persistence: "ephemeral",
    });
    vi.mocked(operationalSession.ensureCheckForOrder).mockResolvedValue({
      id: 200,
      sessionId: null,
    } as Awaited<ReturnType<typeof operationalSession.ensureCheckForOrder>>);
    execute.mockResolvedValue({
      order: { id: 99, tableId: 0, tableNumber: 0 },
      events: [],
      orderNumber: "ORD-1",
      trackingToken: "tok",
      displayReference: "K #001",
      totalAmount: "10.00",
      itemCount: 1,
      createdAt: "2026-07-14T12:00:00.000Z",
    });
  });

  it("places non-table order via identity + ephemeral session", async () => {
    const result = await service.execute({
      restaurantId: 1,
      serviceMode: "counter",
      fulfilmentAnchor: createStationFulfilmentAnchor({
        stationId: "counter-1",
        fulfilmentLabel: "Counter 1",
      }),
      items: [{ menuItemId: 1, quantity: 1 }],
    });

    expect(operationalSession.resolveOperationalSession).toHaveBeenCalledWith(
      expect.objectContaining({
        restaurantId: 1,
        anchor: expect.objectContaining({
          anchorType: "station",
          stationId: "counter-1",
        }),
      })
    );
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({
        restaurantId: 1,
        identity: expect.objectContaining({
          serviceMode: "counter",
          fulfilmentAnchor: expect.objectContaining({
            anchorType: "station",
          }),
          operationalSession: expect.objectContaining({
            sessionId: null,
            anchorType: "station",
          }),
        }),
        tableId: undefined,
        tableNumber: undefined,
        sessionId: null,
      })
    );
    // CHECK-GENERALIZATION-M5 — sessionless place enrolls Check + Membership
    expect(operationalSession.ensureCheckForOrder).toHaveBeenCalledWith({
      restaurantId: 1,
      orderId: 99,
    });
    expect(result.sessionPersistence).toBe("ephemeral");
    expect(result.identity.fulfilmentAnchor.anchorType).toBe("station");
    // Persist dual-write is inside PlaceOrderService; orchestrator leaves table fields unset.
    expect(LEGACY_NON_TABLE_TABLE_ID).toBe(0);
  });
});
