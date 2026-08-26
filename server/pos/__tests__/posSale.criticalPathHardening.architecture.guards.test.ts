/**
 * POS-SALE-COMMAND-CRITICAL-PATH-HARDENING-1 — architecture guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string) {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("POS-SALE-COMMAND-CRITICAL-PATH-HARDENING-1", () => {
  it("overlaps PlaceOrder pricing and number allocation before persist", () => {
    const place = read("server/order/application/PlaceOrderService.ts");
    const pricing = place.indexOf('timeOrderLifecyclePhase("pricing_ms"');
    const number = place.indexOf('timeOrderLifecyclePhase("number_ms"');
    const all = place.indexOf("Promise.all([");
    expect(all).toBeGreaterThan(-1);
    expect(pricing).toBeGreaterThan(all);
    expect(number).toBeGreaterThan(all);
    expect(place).toContain("this.pricing.resolveLines");
    expect(place).toContain("this.orderNumbers.allocate");
  });

  it("writes cashier_pos inbound status on INSERT and keeps accept events", () => {
    const place = read("server/order/application/PlaceOrderService.ts");
    const repo = read(
      "server/order/infrastructure/persistence/DrizzleOrderRepository.ts"
    );
    expect(place).toContain("createRowStatus");
    expect(place).toContain("CASHIER_POS_INBOUND_STATUS");
    expect(place).toContain("cashier-pos-inbound-accept");
    expect(place).not.toContain('status: "preparing"');
    expect(place.match(/p\.pullDomainEvents/g)?.length).toBe(1);
    expect(place).not.toContain("createdEvents");
    expect(place).not.toContain("acceptEvents");
    expect(repo).toContain("createRowStatus");
    expect(repo).toContain("status: createStatus");
    expect(repo).toContain("appendInTransaction");
  });

  it("does not move outbox write, Check, or relay onto a weaker path", () => {
    const sale = read("server/pos/services/PosSaleService.ts");
    const repo = read(
      "server/order/infrastructure/persistence/DrizzleOrderRepository.ts"
    );
    const allocator = read(
      "server/order/business-identity/infrastructure/DrizzleBusinessIdentityAllocator.ts"
    );
    const numbers = read("server/db.ts");
    const occupancy = read("server/subscription-runtime/commercialLimitOccupancy.ts");
    const place = read("server/order/application/PlaceOrderService.ts");
    expect(sale).toContain("awaitRelay: false");
    expect(sale).toContain("enrollCheck: false");
    expect(sale).not.toContain("awaitRelay: true");
    expect(sale).not.toContain("settleCheckPaid");
    expect(sale).not.toContain("occupancyDelta");
    expect(sale).not.toContain("checkLimit");
    expect(sale).toContain("Promise.all([");
    expect(place).toContain("skipBusinessIdentityAllocation");
    expect(place).toContain("ORDERING_CHANNEL_CASHIER_POS");
    expect(repo).toContain("allocateForNewOrder");
    expect(repo).toContain("skipBusinessIdentityAllocation");
    expect(repo).toContain("appendInTransaction");
    expect(repo).toContain("afterPersistInTransaction");
    expect(repo.indexOf("appendInTransaction")).toBeGreaterThan(
      repo.indexOf("noteOrderLifecyclePhase(\"persist_ms\"")
    );
    expect(allocator).toContain("LAST_INSERT_ID");
    expect(numbers).toContain("COUNT(*)");
    expect(numbers).toContain("generateOrderNumber");
    expect(occupancy).toContain("occupancyDelta");
  });
});
