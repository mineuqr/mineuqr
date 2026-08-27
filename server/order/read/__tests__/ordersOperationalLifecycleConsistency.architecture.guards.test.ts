/**
 * ORDERS-OPERATIONAL-LIFECYCLE-CONSISTENCY-REPAIR-1
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../..");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("ORDERS-OPERATIONAL-LIFECYCLE-CONSISTENCY-REPAIR-1 architecture", () => {
  it("listActive membership is active lifecycle on order_read_orders with read-side catch-up", () => {
    const service = read("server/order/read/services/OrderReadWorkspaceService.ts");
    const store = read(
      "server/order/read/infrastructure/DrizzleOrderOperationalReadStore.ts"
    );
    const contracts = read("server/order/read/domain/contracts/queryContracts.ts");
    const catchUp = read("server/order/read/catchUpOrderReadProjection.ts");

    expect(service).toContain("await catchUpOrderReadProjection()");
    expect(service).toContain("this.store.listActiveOrders");
    expect(store).toContain("orderReadOrders");
    expect(store).toContain("lifecycleStage");
    expect(store).toContain("operationalLifecycleFilter()");
    expect(store).toContain("cashierPosPaidOperationalVisibilitySql()");
    expect(contracts).toContain("lifecycleStage=active");
    expect(catchUp).toContain("runOrderEventRelayBatch");
    expect(catchUp).not.toContain("commitCollectionFact");
    expect(catchUp).not.toContain("placeOrderService");
  });

  it("place and status HTTP keep deferred relay (no second persist path)", () => {
    const routers = read("server/routers.ts");
    const createFn = routers.slice(
      routers.indexOf("  create: publicProcedure"),
      routers.indexOf("  list: verifiedProcedure", routers.indexOf("  create: publicProcedure"))
    );
    const identityFn = routers.slice(
      routers.indexOf("placeWithIdentity:"),
      routers.indexOf("placeAsWaiter:")
    );
    const waiterFn = routers.slice(
      routers.indexOf("placeAsWaiter:"),
      routers.indexOf("  create: publicProcedure")
    );
    const updateStart = routers.indexOf("  updateStatus: verifiedProcedure");
    const updateStatus = routers.slice(updateStart, updateStart + 2500);
    const waiterDevice = read(
      "server/operational-device/services/WaiterDeviceOrderingService.ts"
    );
    const device = read(
      "server/operational-device/services/DeviceOrderExecutionService.ts"
    );

    expect(createFn).toContain("placeOrderService.execute");
    expect(createFn).toContain("awaitRelay: false");
    expect(createFn).not.toContain("commitCollectionFact");
    expect(identityFn).toContain("identityPlaceOrderService.execute");
    expect(identityFn).toContain("awaitRelay: false");
    expect(identityFn).not.toContain("commitCollectionFact");
    expect(waiterFn).toContain("identityPlaceOrderService.execute");
    expect(waiterFn).toContain("awaitRelay: false");
    expect(waiterDevice).toContain("awaitRelay: false");
    expect(device).toContain("awaitRelay: false");
    expect(updateStatus).toContain("awaitRelay: false");
    expect(updateStatus).not.toContain("commitCollectionFact");
    expect(catchUpDoesNotPlace(createFn)).toBe(true);
  });

  it("Serve completes operational lifecycle and does not create Collection Fact", () => {
    const advance = read("server/order/application/AdvanceOrderStatusService.ts");
    expect(advance).toContain('command.targetStatus === "served"');
    expect(advance).toContain('order.advanceLifecycleStage("completed"');
    expect(advance).not.toContain("commitCollectionFact");
    expect(advance).not.toContain("confirmPayment");
    expect(advance).not.toContain("markPaid");
  });

  it("Orders workspace polls the authoritative listActive query at 3s without invalidate spray", () => {
    const panel = read("client/src/components/orders-workspace/OrdersWorkspacePanel.tsx");
    const runtime = read("client/src/lib/queryRuntime.ts");
    const actions = read("client/src/lib/operational-workspace/useOrderStatusActions.ts");
    expect(panel).toContain("trpc.order.read.listActive.useQuery");
    expect(panel).toContain("orderReadListQueryOptions(enabled)");
    expect(panel).not.toContain("realtimePrimary");
    expect(runtime).toContain("OPERATIONAL_LIFECYCLE_POLL_MS = 3_000");
    expect(runtime).toContain("orderReadListQueryOptions(enabled: boolean)");
    expect(runtime).not.toMatch(
      /function orderReadListQueryOptions[\s\S]*realtimePrimary/
    );
    expect(actions).not.toContain("utils.order.list.invalidate");
    expect(panel).not.toMatch(/invalidateQueries/);
  });

  it("optimistic serve removal is cache-only; remount follows the read model", () => {
    const patch = read("client/src/lib/operational-workspace/orderStatusActionCache.ts");
    const governance = read("shared/read-freshness/governance.ts");
    expect(patch).toContain('status === "served"');
    expect(patch).toContain("filter((item) => item.orderId !== orderId)");
    expect(governance).toContain("isTerminalConfirmedOmission");
    expect(governance).toContain("in-memory only");
  });

  it("does not invent time/LIMIT membership hacks or a new migration", () => {
    const store = read(
      "server/order/read/infrastructure/DrizzleOrderOperationalReadStore.ts"
    );
    const service = read("server/order/read/services/OrderReadWorkspaceService.ts");
    expect(store).not.toMatch(/DATE_SUB|INTERVAL \d+|30 second|45 second|60 second/);
    expect(service).not.toMatch(/DATE_SUB|INTERVAL \d+|30 second/);
    expect(existsSync(join(repoRoot, "drizzle/0100_orders_lifecycle_consistency.sql"))).toBe(
      false
    );
    expect(read("drizzle/0098_pos_sale_idempotency_open_check.sql")).toContain(
      "ADD COLUMN `checkId` int NOT NULL"
    );
    expect(read("drizzle/0099_cashier_order_handoffs.sql")).toContain(
      "CREATE TABLE `cashier_order_handoffs`"
    );
  });

  it("keeps Cashier handoff and Confirm financial writers unchanged", () => {
    const intent = read("server/pos/services/InvoiceIntentService.ts");
    const handoff = read("server/pos/cashier-handoff/CashierHandoffService.ts");
    const confirm = read(
      "server/operational-session/payment/PaymentConfirmService.ts"
    );
    expect(intent).toContain("listCashierHandoffsByRestaurant");
    expect(handoff).toContain("insertCashierHandoffIgnoreDuplicate");
    expect(handoff).not.toContain("commitCollectionFact");
    expect(confirm).toContain("commitCashierProductionCollectionFact");
  });
});

function catchUpDoesNotPlace(createFn: string): boolean {
  return !createFn.includes("catchUpOrderReadProjection");
}
