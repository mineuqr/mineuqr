/**
 * WAITER-ATTACH-MUST-NOT-OPEN-SESSION-1 — architecture guards.
 *
 * Attach is table binding only. First Waiter Order opens Session inside the
 * common Order persist transaction. No Waiter-specific Order/Outbox/financial writer.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function sliceBetween(source: string, startNeedle: string, endNeedle: string): string {
  const start = source.indexOf(startNeedle);
  expect(start).toBeGreaterThan(-1);
  const end = source.indexOf(endNeedle, start + startNeedle.length);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe("Waiter attach must not open a Session", () => {
  it("staff attachTable binds via bindWaiterTable and never createSession", () => {
    const routers = read("server/routers.ts");
    const attach = sliceBetween(
      routers,
      "attachTable: protectedProcedure",
      "const sessionRouter"
    );
    expect(attach).toContain("bindWaiterTable");
    expect(attach).not.toContain("resolveOperationalSession");
    expect(attach).not.toContain("createSession");
    expect(attach).not.toContain("SESSION_OPENED");
  });

  it("device attachWaiterTable binds via bindWaiterTable and never createSession", () => {
    const service = read(
      "server/operational-device/services/WaiterDeviceOrderingService.ts"
    );
    const attach = sliceBetween(
      service,
      "export async function attachWaiterTableForDevice",
      "export async function placeWaiterOrderForDevice"
    );
    expect(attach).toContain("bindWaiterTable");
    expect(attach).not.toContain("resolveOperationalSession");
    expect(attach).not.toContain("createSession");
    expect(service).not.toContain("createSession");
  });

  it("bindWaiterTable only reads getActiveSession", () => {
    const bind = read("server/operational-device/services/bindWaiterTable.ts");
    expect(bind).toContain("getActiveSession");
    expect(bind).not.toContain("resolveOperationalSession");
    expect(bind).not.toContain("createSession");
    expect(bind).not.toContain("createOpenCheckForSession");
    expect(bind).not.toContain("insertSession");
  });

  it("Waiter first Order defers Session onto the common persist transaction", () => {
    const routers = read("server/routers.ts");
    const place = sliceBetween(
      routers,
      "placeAsWaiter: verifiedProcedure",
      "create: publicProcedure"
    );
    expect(place).toContain("identityPlaceOrderService.execute");
    expect(place).toContain("resolveTableSessionInTransaction: true");
    expect(place).toContain('identityScope: "WAITER"');
    expect(place).toContain("ORDERING_CHANNEL_WAITER_TABLET");

    const device = read(
      "server/operational-device/services/WaiterDeviceOrderingService.ts"
    );
    expect(device).toContain("resolveTableSessionInTransaction: true");
    expect(device).toContain('identityScope: "WAITER"');

    const identity = read(
      "server/order/application/IdentityPlaceOrderService.ts"
    );
    expect(identity).toContain("resolveSessionInTransaction");
    expect(identity).toContain("resolveTableSessionInTransaction");
  });

  it("Waiter place does not own Order, Outbox, or financial writers", () => {
    const device = read(
      "server/operational-device/services/WaiterDeviceOrderingService.ts"
    );
    const bind = read("server/operational-device/services/bindWaiterTable.ts");
    for (const source of [device, bind]) {
      expect(source).not.toContain("DrizzleOrderRepository");
      expect(source).not.toContain("insertLegacy");
      expect(source).not.toContain("updateLegacy");
      expect(source).not.toContain("orderDomainOutbox");
      expect(source).not.toContain("CashierHandoffService");
      expect(source).not.toContain("settleCheckPaid");
      expect(source).not.toContain("createInvoice");
      expect(source).not.toContain("collectionFact");
    }
  });
});
