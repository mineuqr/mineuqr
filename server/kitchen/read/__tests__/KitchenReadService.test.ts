import { describe, expect, it, vi } from "vitest";
import { KitchenReadService } from "../services/KitchenReadService";
import type { OrderReadQueryPort } from "../infrastructure/OrderReadQueryAdapter";
import type { KitchenTicketDto } from "../contracts/kitchenQueryContracts";
import { catchUpOrderReadProjection } from "../../../order/read/catchUpOrderReadProjection";

vi.mock("../../../order/read/catchUpOrderReadProjection", () => ({
  catchUpOrderReadProjection: vi.fn(async () => undefined),
}));

function sampleTicket(status: "pending" | "preparing" | "ready", orderId: number, createdAt: string): KitchenTicketDto {
  return {
    orderId,
    orderNumber: `ORD-${orderId}`,
    businessDay: null,
    dailyDisplayNumber: null,
    displayOrderNumber: String(orderId),
    displayReference: String(orderId),
    tableNumber: 1,
    sessionId: null,
    serviceMode: "table_service",
    fulfilmentAnchorType: "table",
    fulfilmentLabel: "1",
    customerName: null,
    orderNotes: null,
    status,
    totalAmount: "10.00",
    createdAt,
    readyAt: null,
    statusEnteredAt: createdAt,
    elapsedSeconds: 0,
    columnElapsedSeconds: 0,
    urgencyTier: "normal",
    lineCount: 1,
    linesSummary: "1× Item",
    lineItems: [],
    lastEventId: null,
  };
}

describe("KitchenReadService", () => {
  it("composes queue from order read port and applies fifo policy", async () => {
    const port: OrderReadQueryPort = {
      listPipelineOrders: vi.fn().mockResolvedValue([
        {
          restaurantId: 5,
          orderId: 2,
          orderNumber: "ORD-2",
          businessDay: null,
          dailyDisplayNumber: null,
          displayOrderNumber: "2",
          displayReference: "2",
          status: "pending",
          tableId: 1,
          tableNumber: 2,
          sessionId: null,
          serviceMode: "table_service",
          fulfilmentAnchorType: "table",
          fulfilmentLabel: "2",
          customerName: null,
          customerPhone: null,
          notes: null,
          totalAmount: "12.00",
          createdAt: "2026-07-04T11:00:00",
          readyAt: null,
          lastEventId: "e2",
          lineItems: [],
        },
        {
          restaurantId: 5,
          orderId: 1,
          orderNumber: "ORD-1",
          businessDay: null,
          dailyDisplayNumber: null,
          displayOrderNumber: "1",
          displayReference: "1",
          status: "preparing",
          tableId: 1,
          tableNumber: 1,
          sessionId: null,
          serviceMode: "table_service",
          fulfilmentAnchorType: "table",
          fulfilmentLabel: "1",
          customerName: null,
          customerPhone: null,
          notes: null,
          totalAmount: "10.00",
          createdAt: "2026-07-04T10:00:00",
          readyAt: null,
          lastEventId: "e1",
          lineItems: [],
        },
      ]),
      listTimelinesForOrders: vi.fn().mockResolvedValue(new Map()),
    };

    const service = new KitchenReadService(port);
    vi.mocked(catchUpOrderReadProjection).mockClear();
    const result = await service.getQueue({ restaurantId: 5, status: "all" });

    expect(catchUpOrderReadProjection).toHaveBeenCalledTimes(1);
    expect(vi.mocked(catchUpOrderReadProjection).mock.invocationCallOrder[0]).toBeLessThan(
      (port.listPipelineOrders as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0]
    );

    expect(result.orderingPolicyId).toBe("fifo-by-created-at");
    expect(result.meta.counts.pending).toBe(1);
    expect(result.meta.counts.preparing).toBe(1);
    expect(result.tickets[0]?.orderId).toBe(1);
    expect(result.columns.pending[0]?.orderId).toBe(2);
  });

  it("filters by status", async () => {
    const port: OrderReadQueryPort = {
      listPipelineOrders: vi.fn().mockResolvedValue([]),
      listTimelinesForOrders: vi.fn().mockResolvedValue(new Map()),
    };
    const composer = {
      composeTickets: vi.fn().mockReturnValue([
        sampleTicket("pending", 1, "2026-07-04T10:00:00"),
        sampleTicket("ready", 2, "2026-07-04T10:05:00"),
      ]),
    };

    const service = new KitchenReadService(port, composer as never);
    const result = await service.getQueue({ restaurantId: 1, status: "ready" });

    expect(result.tickets).toHaveLength(1);
    expect(result.tickets[0]?.status).toBe("ready");
  });

  it("respects queue limit", async () => {
    const port: OrderReadQueryPort = {
      listPipelineOrders: vi.fn().mockResolvedValue([]),
      listTimelinesForOrders: vi.fn().mockResolvedValue(new Map()),
    };
    const tickets = Array.from({ length: 5 }, (_, i) =>
      sampleTicket("pending", i + 1, `2026-07-04T10:0${i}:00`)
    );
    const composer = {
      composeTickets: vi.fn().mockReturnValue(tickets),
    };

    const service = new KitchenReadService(port, composer as never);
    const result = await service.getQueue({ restaurantId: 1, limit: 2 });

    expect(result.tickets).toHaveLength(2);
    expect(result.meta.totalVisible).toBe(2);
  });
});

describe("KitchenReadService architecture", () => {
  it("does not import write-model order repositories", async () => {
    const source = await import("fs/promises").then((fs) =>
      fs.readFile(new URL("../services/KitchenReadService.ts", import.meta.url), "utf8")
    );
    expect(source).not.toMatch(/getOrdersWithItems|getOrderById/);
    expect(source).toContain("OrderReadQueryPort");
    expect(source).toContain("catchUpOrderReadProjection");
    expect(source).not.toContain("runOrderEventRelayBatch");
    expect(source).not.toContain("KitchenQueueProjectionConsumer");
  });
});
