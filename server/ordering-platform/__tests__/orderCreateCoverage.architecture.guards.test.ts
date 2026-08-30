/**
 * ORDER-CREATE-COVERAGE-COMMAND-RESTORE-1 — live Place inventory + convergence.
 *
 * Executable gate: pnpm db:order-create:coverage
 * Architecture-guard evidence only (SOURCE). Not real-DB / browser / Production.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ORDERING_PLATFORM_ACTIVE_CHANNELS,
  ORDERING_PLATFORM_FUTURE_CHANNELS,
  ORDERING_PLATFORM_PLACE_ORDER_LIVE_ENTRIES,
  ORDERING_PLATFORM_PLACE_ORDER_SERVICE,
} from "../orderingPlatformOwnership";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

function walkTs(relDir: string): string[] {
  const abs = join(repoRoot, relDir);
  const out: string[] = [];
  const stack = [abs];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const st = statSync(full);
      if (st.isDirectory()) {
        if (entry === "__tests__" || entry === "node_modules") continue;
        stack.push(full);
        continue;
      }
      if (entry.endsWith(".test.ts") || entry.endsWith(".spec.ts")) continue;
      if (entry.endsWith(".ts")) {
        out.push(relative(repoRoot, full).replace(/\\/g, "/"));
      }
    }
  }
  return out;
}

describe("ORDER-CREATE-COVERAGE-COMMAND-RESTORE-1 inventory", () => {
  it("ACTIVE_CHANNELS is the live Place inventory", () => {
    expect([...ORDERING_PLATFORM_ACTIVE_CHANNELS]).toEqual([
      "qr",
      "waiter_tablet",
      "kiosk",
      "cashier_pos",
    ]);
    expect(ORDERING_PLATFORM_ACTIVE_CHANNELS).not.toContain("table_session");
    expect(ORDERING_PLATFORM_ACTIVE_CHANNELS).not.toContain("mobile");
    expect(ORDERING_PLATFORM_ACTIVE_CHANNELS).not.toContain("marketplace");
    expect(ORDERING_PLATFORM_FUTURE_CHANNELS).toEqual(["mobile"]);
    expect(ORDERING_PLATFORM_PLACE_ORDER_SERVICE).toContain("PlaceOrderService");
    expect([...ORDERING_PLATFORM_PLACE_ORDER_LIVE_ENTRIES]).toEqual([
      "server/routers.ts:order.create",
      "server/routers.ts:order.placeWithIdentity",
      "server/routers.ts:order.placeAsWaiter",
      "server/operational-device/services/WaiterDeviceOrderingService.ts:placeWaiterOrderForDevice",
      "server/pos/services/PosSaleService.ts",
    ]);
  });

  it("QR / Waiter / Kiosk / POS converge on Place or Identity → Place", () => {
    const routers = read("server/routers.ts");
    const createStart = routers.indexOf("  create: publicProcedure");
    const create = routers.slice(createStart, routers.indexOf("  list: verifiedProcedure", createStart));
    expect(create).toContain("placeOrderService.execute");
    expect(create).toContain("ORDERING_CHANNEL_QR");

    const identity = routers.slice(
      routers.indexOf("placeWithIdentity: publicProcedure"),
      routers.indexOf("settlePaid: publicProcedure")
    );
    expect(identity).toContain("identityPlaceOrderService.execute");

    const waiter = routers.slice(
      routers.indexOf("placeAsWaiter: verifiedProcedure"),
      routers.indexOf("  create: publicProcedure")
    );
    expect(waiter).toContain("identityPlaceOrderService.execute");
    expect(waiter).toContain("ORDERING_CHANNEL_WAITER_TABLET");

    const device = read(
      "server/operational-device/services/WaiterDeviceOrderingService.ts"
    );
    expect(device).toContain("identityPlaceOrderService.execute");
    expect(device).toContain("ORDERING_CHANNEL_WAITER_TABLET");

    const kiosk = read("client/src/lib/ordering-client/kiosk/KioskOrderingClientHost.tsx");
    expect(kiosk).toContain("ORDERING_CHANNEL_KIOSK");

    const sale = read("server/pos/services/PosSaleService.ts");
    expect(sale).toContain("this.placeOrder.execute");
    expect(sale).toContain("ORDERING_CHANNEL_CASHIER_POS");
    expect(sale).toContain('identityScope: "POS"');

    const composition = read("server/order/placeOrderComposition.ts");
    expect(composition).toContain("new PlaceOrderService");
    expect(composition).toContain("new IdentityPlaceOrderService");
    expect(composition).toContain("new DrizzleOrderRepository");
  });

  it("DrizzleOrderRepository is the only production orders/orderItems INSERT writer", () => {
    const hits = walkTs("server").filter((rel) => {
      const src = read(rel);
      return src.includes("insert(orders)") || src.includes("insert(orderItems)");
    });
    expect(hits).toEqual([
      "server/order/infrastructure/persistence/DrizzleOrderRepository.ts",
    ]);
  });

  it("legacy db Order writers and insertLegacy remain absent", () => {
    const db = read("server/db.ts");
    expect(db).not.toMatch(/export async function createOrder\b/);
    expect(db).not.toMatch(/export async function createOrderItems\b/);
    expect(db).not.toMatch(/export async function updateOrderStatus\b/);
    const repo = read(
      "server/order/infrastructure/persistence/DrizzleOrderRepository.ts"
    );
    expect(repo).not.toContain("insertLegacy");
    expect(repo).toContain("this.outbox.appendInTransaction(tx, outboxInputs)");
  });

  it("Place does not write Invoice / CF / PAID / Settlement / Drawer", () => {
    const place = read("server/order/application/PlaceOrderService.ts");
    const identity = read("server/order/application/IdentityPlaceOrderService.ts");
    for (const src of [place, identity]) {
      expect(src).not.toContain("createInvoice");
      expect(src).not.toContain("commitCollectionFact");
      expect(src).not.toContain("confirmPayment");
      expect(src).not.toContain("settleCheckPaid");
      expect(src).not.toContain("openFinancialShift");
      expect(src).not.toContain("submissionId");
    }
  });

  it("Recovery, print, and realtime do not create Orders", () => {
    const recover = read(
      "server/operational-session/payment/recoverCashierPosDownstreamSettlement.ts"
    );
    expect(recover).not.toContain("createOrder");
    expect(recover).not.toContain("placeOrderService");
    expect(recover).not.toContain("identityPlaceOrderService");
    expect(recover).not.toContain("insert(orders)");

    const print = read(
      "server/order/infrastructure/events/consumers/OrderPrintingConsumer.ts"
    );
    expect(print).not.toContain("insert(orders)");
    expect(print).not.toContain("placeOrderService");
    expect(print).toContain("dispatchPrintRequest");

    const realtime = read(
      "server/order/read/realtime/publishExpoRealtimeHintAfterProjection.ts"
    );
    expect(realtime).not.toContain("insert(orders)");
    expect(realtime).not.toContain("placeOrderService");
  });
});
