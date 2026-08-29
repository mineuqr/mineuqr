import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createStationFulfilmentAnchor,
  createTableFulfilmentAnchor,
  LEGACY_NON_TABLE_TABLE_ID,
} from "@shared/ordering-platform/orderingIdentityContract";
import {
  IdentityPlaceOrderService,
} from "../IdentityPlaceOrderService";
import {
  PlaceOrderValidationError,
  type PlaceOrderService,
} from "../PlaceOrderService";
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
      orderingChannel: "kiosk",
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

  it("forwards afterPersistInTransaction into PlaceOrder and still enrolls Check after commit", async () => {
    const hook = vi.fn();
    await service.execute(
      {
        restaurantId: 1,
        serviceMode: "counter",
        fulfilmentAnchor: createStationFulfilmentAnchor({
          stationId: "counter-1",
          fulfilmentLabel: "Counter 1",
        }),
        orderingChannel: "kiosk",
        items: [{ menuItemId: 1, quantity: 1 }],
      },
      { afterPersistInTransaction: hook }
    );
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({ restaurantId: 1 }),
      expect.objectContaining({ afterPersistInTransaction: hook })
    );
    expect(operationalSession.ensureCheckForOrder).toHaveBeenCalledWith({
      restaurantId: 1,
      orderId: 99,
    });
  });

  it("does not resolve a Dining Session for cashier_pos", async () => {
    await service.execute(
      {
        restaurantId: 1,
        serviceMode: "counter",
        fulfilmentAnchor: createStationFulfilmentAnchor({
          stationId: "pos-1",
          fulfilmentLabel: "POS 1",
        }),
        orderingChannel: "cashier_pos",
        items: [{ menuItemId: 1, quantity: 1 }],
      },
      { enrollCheck: false }
    );
    expect(operationalSession.resolveOperationalSession).not.toHaveBeenCalled();
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({
        orderingChannel: "cashier_pos",
        sessionId: null,
        tableId: undefined,
        tableNumber: undefined,
        identity: expect.objectContaining({
          operationalSession: expect.objectContaining({ sessionId: null }),
        }),
      }),
      expect.anything()
    );
  });

  it("fails closed when cashier_pos is given a table fulfilment anchor", async () => {
    await expect(
      service.execute({
        restaurantId: 1,
        serviceMode: "table_service",
        fulfilmentAnchor: createTableFulfilmentAnchor({
          tableId: 7,
          tableNumber: 3,
        }),
        orderingChannel: "cashier_pos",
        items: [{ menuItemId: 1, quantity: 1 }],
      })
    ).rejects.toBeInstanceOf(PlaceOrderValidationError);
    expect(operationalSession.resolveOperationalSession).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
  });

  it("does not await Check enrollment when enrollCheck is false", async () => {
    vi.mocked(operationalSession.ensureCheckForOrder).mockImplementation(
      async () =>
        await new Promise(() => {
          /* never resolves — would hang the sale HTTP if still awaited */
        })
    );
    const result = await service.execute(
      {
        restaurantId: 1,
        serviceMode: "counter",
        fulfilmentAnchor: createStationFulfilmentAnchor({
          stationId: "pos-1",
          fulfilmentLabel: "POS 1",
        }),
        orderingChannel: "cashier_pos",
        items: [{ menuItemId: 1, quantity: 1 }],
      },
      { enrollCheck: false }
    );
    expect(result.order.id).toBe(99);
    expect(operationalSession.ensureCheckForOrder).not.toHaveBeenCalled();
  });

  it("sale-path Check enrollment is on the HTTP await when enrollCheck is default", async () => {
    const CHECK_MS = 80;
    vi.mocked(operationalSession.ensureCheckForOrder).mockImplementation(
      async () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              id: 200,
              sessionId: null,
            } as Awaited<ReturnType<typeof operationalSession.ensureCheckForOrder>>);
          }, CHECK_MS);
        })
    );
    const started = Date.now();
    await service.execute({
      restaurantId: 1,
      serviceMode: "counter",
      fulfilmentAnchor: createStationFulfilmentAnchor({
        stationId: "pos-1",
        fulfilmentLabel: "POS 1",
      }),
      orderingChannel: "cashier_pos",
      items: [{ menuItemId: 1, quantity: 1 }],
    });
    expect(Date.now() - started).toBeGreaterThanOrEqual(CHECK_MS - 15);
  });

  it("defers table Session resolution onto the persist transaction", async () => {
    const callOrder: string[] = [];
    vi.mocked(operationalSession.resolveOperationalSession).mockImplementation(
      async (_request, client) => {
        callOrder.push(client ? "resolve-in-tx" : "resolve-before");
        return {
          session: {
            id: 44,
            restaurantId: 1,
            status: "open",
            sessionToken: "waiter-session-token",
            anchor: {
              anchorType: "table",
              tableId: 7,
              tableNumber: 3,
            },
            openedAt: "2026-08-29T00:00:00.000Z",
            settledAt: null,
            closedAt: null,
            settlementOutcome: null,
            totalAmount: null,
            totalOrders: 0,
            activeCheckId: 800,
          },
          created: true,
          persistence: "persistent",
        };
      }
    );
    execute.mockImplementation(async (_command, persist) => {
      callOrder.push("place");
      const resolved = await persist?.resolveSessionInTransaction?.({});
      return {
        order: { id: 99, sessionId: resolved?.sessionId ?? null },
        events: [],
        orderNumber: "ORD-1",
        trackingToken: "tok",
        displayReference: "WT #001",
        totalAmount: "10.00",
        itemCount: 1,
        createdAt: "2026-07-14T12:00:00.000Z",
      };
    });

    const result = await service.execute(
      {
        restaurantId: 1,
        serviceMode: "table_service",
        fulfilmentAnchor: createTableFulfilmentAnchor({
          tableId: 7,
          tableNumber: 3,
        }),
        orderingChannel: "waiter_tablet",
        identityScope: "WAITER",
        items: [{ menuItemId: 1, quantity: 1 }],
      },
      { resolveTableSessionInTransaction: true }
    );

    expect(callOrder).toEqual(["place", "resolve-in-tx"]);
    expect(result.identity.operationalSession.sessionId).toBe(44);
    expect(result.identity.operationalSession.sessionToken).toBe(
      "waiter-session-token"
    );
    expect(result.sessionPersistence).toBe("persistent");
    expect(operationalSession.ensureCheckForOrder).not.toHaveBeenCalled();
  });
});

