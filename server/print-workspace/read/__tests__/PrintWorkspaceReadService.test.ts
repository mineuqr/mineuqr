import { describe, expect, it, vi } from "vitest";
import { PrintWorkspaceReadService } from "../services/PrintWorkspaceReadService";
import type { PrintWorkspaceOrderDto } from "../contracts/printWorkspaceQueryContracts";

const sampleOrder: PrintWorkspaceOrderDto = {
  orderId: 1,
  orderNumber: "ORD-0001",
  businessDay: "2026-07-10",
  dailyDisplayNumber: 1,
  displayOrderNumber: "001",
  displayReference: "001",
  status: "ready",
  tableNumber: 3,
  sessionId: null,
  serviceMode: "table_service",
  fulfilmentAnchorType: "table",
  fulfilmentLabel: "3",
  customerName: "Guest",
  customerPhone: null,
  notes: null,
  totalAmount: "25.00",
  createdAt: "2026-06-29T12:00:00",
  readyAt: null,
  servedAt: null,
  isActive: true,
  lineItems: [],
};

describe("PrintWorkspaceReadService", () => {
  it("lists orders from read store only", async () => {
    const store = {
      listOrders: vi.fn().mockResolvedValue([sampleOrder]),
      getOrderDetail: vi.fn(),
    };
    const service = new PrintWorkspaceReadService(store as never);
    const result = await service.listOrders({ restaurantId: 10, view: "awaiting" });

    expect(store.listOrders).toHaveBeenCalledWith(
      expect.objectContaining({ restaurantId: 10, view: "awaiting" })
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.orderNumber).toBe("ORD-0001");
    expect(result.items[0]?.displayReference).toBe("001");
    expect(result.pageInfo.hasMore).toBe(false);
  });

  it("paginates when store returns more than limit", async () => {
    const rows = Array.from({ length: 3 }, (_, i) => ({
      ...sampleOrder,
      orderId: i + 1,
      createdAt: `2026-06-29T12:0${i}:00`,
    }));
    const store = {
      listOrders: vi.fn().mockResolvedValue(rows),
      getOrderDetail: vi.fn(),
    };
    const service = new PrintWorkspaceReadService(store as never);

    const result = await service.listOrders({ restaurantId: 10, limit: 2 });

    expect(result.items).toHaveLength(2);
    expect(result.pageInfo.hasMore).toBe(true);
    expect(result.pageInfo.nextCursor).toBeTruthy();
  });

  it("returns null when detail missing", async () => {
    const store = {
      listOrders: vi.fn(),
      getOrderDetail: vi.fn().mockResolvedValue(null),
    };
    const service = new PrintWorkspaceReadService(store as never);

    const result = await service.getOrderDetail({ restaurantId: 10, orderId: 99 });
    expect(result).toBeNull();
  });
});

describe("PrintWorkspaceReadService architecture", () => {
  it("does not import write-model order repositories", async () => {
    const source = await import("fs/promises").then((fs) =>
      fs.readFile(
        new URL("../services/PrintWorkspaceReadService.ts", import.meta.url),
        "utf8"
      )
    );
    expect(source).not.toMatch(/getOrdersWithItems|getOrderById/);
    expect(source).toContain("DrizzlePrintWorkspaceReadStore");
  });
});
