/**
 * CHANNEL-TAXONOMY-CLEANUP-1 — production writer honesty.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ORDERING_CHANNEL_CASHIER_POS,
  ORDERING_CHANNEL_IDS,
  ORDERING_CHANNEL_KIOSK,
  ORDERING_CHANNEL_QR,
  ORDERING_CHANNEL_REGISTRY,
  ORDERING_CHANNEL_TABLE_SESSION,
  ORDERING_CHANNEL_WAITER_TABLET,
  getOrderingChannelRegistryEntry,
  mapOrderingChannelToSalesChannel,
  resolveReportingSalesChannel,
} from "../orderingChannelRegistry";
import { ORDERING_SERVICE_MODES } from "../orderingIdentityContract";
import {
  isCashierFinalizableOrderingChannel,
  isCashierHandoffEligibleOrderingChannel,
} from "../../pos/cashierFinancialFinalization";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

function orderCreateSlice(routers: string): string {
  const start = routers.indexOf("  create: publicProcedure");
  const end = routers.indexOf("  list: verifiedProcedure", start);
  return routers.slice(start, end);
}

function placeAsWaiterSlice(routers: string): string {
  return routers.slice(
    routers.indexOf("placeAsWaiter:"),
    routers.indexOf("  create: publicProcedure")
  );
}

describe("CHANNEL-TAXONOMY-CLEANUP-1", () => {
  it("Table QR order.create stamps qr, not table_session, and may attach sessionId", () => {
    const createFn = orderCreateSlice(read("server/routers.ts"));
    expect(createFn).toContain("orderingChannel: ORDERING_CHANNEL_QR");
    expect(createFn).not.toContain("ORDERING_CHANNEL_TABLE_SESSION");
    expect(createFn).toContain("sessionId");
    expect(createFn).toContain("placeOrderService.execute");
  });

  it("Waiter place stamps waiter_tablet", () => {
    const waiterFn = placeAsWaiterSlice(read("server/routers.ts"));
    expect(waiterFn).toContain("orderingChannel: ORDERING_CHANNEL_WAITER_TABLET");
    expect(waiterFn).not.toContain("ORDERING_CHANNEL_TABLE_SESSION");
    const device = read(
      "server/operational-device/services/WaiterDeviceOrderingService.ts"
    );
    expect(device).toContain("ORDERING_CHANNEL_WAITER_TABLET");
  });

  it("Kiosk host and POS sale stamp their live channels", () => {
    const kiosk = read("client/src/lib/ordering-client/kiosk/KioskOrderingClientHost.tsx");
    expect(kiosk).toContain("ORDERING_CHANNEL_KIOSK");
    const sale = read("server/pos/services/PosSaleService.ts");
    expect(sale).toContain("orderingChannel: ORDERING_CHANNEL_CASHIER_POS");
  });

  it("has no production Place writer for table_session", () => {
    const writers = [
      read("server/routers.ts"),
      read("server/pos/services/PosSaleService.ts"),
      read("server/pos/services/PosCheckIntakeService.ts"),
      read("server/operational-device/services/WaiterDeviceOrderingService.ts"),
      read("client/src/lib/ordering-client/qr/QrOrderingClientHost.tsx"),
      read("client/src/lib/ordering-client/kiosk/KioskOrderingClientHost.tsx"),
    ];
    for (const src of writers) {
      expect(src).not.toMatch(/orderingChannel:\s*ORDERING_CHANNEL_TABLE_SESSION/);
    }
  });

  it("does not treat identityScope, session, serviceMode, or counter as channels", () => {
    expect(ORDERING_CHANNEL_IDS).not.toContain("counter");
    expect(ORDERING_CHANNEL_IDS).not.toContain("TABLE");
    expect(ORDERING_CHANNEL_IDS).not.toContain("session");
    expect(ORDERING_SERVICE_MODES).toContain("counter");
    expect(
      resolveReportingSalesChannel({
        orderingChannel: ORDERING_CHANNEL_QR,
        identityScope: "TABLE",
      })
    ).toBe("qr");
    expect(
      resolveReportingSalesChannel({
        orderingChannel: null,
        identityScope: "TABLE",
      })
    ).not.toBe("table");
  });

  it("reports Table QR as qr, not the unused table_session bucket", () => {
    expect(mapOrderingChannelToSalesChannel(ORDERING_CHANNEL_QR)).toBe("qr");
    expect(mapOrderingChannelToSalesChannel(ORDERING_CHANNEL_TABLE_SESSION)).toBe(
      "table"
    );
  });

  it("handoff copies order.orderingChannel; cashier_pos cannot Incoming-Queue", () => {
    const handoff = read("server/pos/cashier-handoff/CashierHandoffService.ts");
    expect(handoff).toContain("sourceChannel: order.orderingChannel");
    expect(isCashierHandoffEligibleOrderingChannel(ORDERING_CHANNEL_QR)).toBe(true);
    expect(isCashierHandoffEligibleOrderingChannel(ORDERING_CHANNEL_WAITER_TABLET)).toBe(
      true
    );
    expect(isCashierHandoffEligibleOrderingChannel(ORDERING_CHANNEL_KIOSK)).toBe(true);
    expect(isCashierHandoffEligibleOrderingChannel(ORDERING_CHANNEL_CASHIER_POS)).toBe(
      false
    );
    expect(isCashierFinalizableOrderingChannel(ORDERING_CHANNEL_CASHIER_POS)).toBe(true);
  });

  it("registry lifecycle matches live vs unused writers", () => {
    expect(getOrderingChannelRegistryEntry(ORDERING_CHANNEL_QR)?.lifecycle).toBe(
      "active"
    );
    expect(
      getOrderingChannelRegistryEntry(ORDERING_CHANNEL_WAITER_TABLET)?.lifecycle
    ).toBe("active");
    expect(getOrderingChannelRegistryEntry(ORDERING_CHANNEL_KIOSK)?.lifecycle).toBe(
      "active"
    );
    expect(
      getOrderingChannelRegistryEntry(ORDERING_CHANNEL_CASHIER_POS)?.lifecycle
    ).toBe("active");
    expect(
      getOrderingChannelRegistryEntry(ORDERING_CHANNEL_TABLE_SESSION)?.lifecycle
    ).toBe("registered");
    expect(ORDERING_CHANNEL_REGISTRY.find((e) => e.id === "mobile")?.lifecycle).toBe(
      "registered"
    );
  });

  it("does not invent a counter channel or a 0100 migration", () => {
    expect(ORDERING_CHANNEL_IDS.includes("counter" as never)).toBe(false);
    expect(existsSync(join(repoRoot, "drizzle/0100_channel_taxonomy.sql"))).toBe(
      false
    );
    expect(read("drizzle/0098_pos_sale_idempotency_open_check.sql")).toContain(
      "ADD COLUMN `checkId` int NOT NULL"
    );
    expect(read("drizzle/0099_cashier_order_handoffs.sql")).toContain(
      "CREATE TABLE `cashier_order_handoffs`"
    );
    const registry = read("shared/ordering-platform/orderingChannelRegistry.ts");
    expect(registry).not.toContain("commitCollectionFact");
    expect(registry).not.toContain("confirmPayment");
  });
});
