/**
 * ORDER-SUBMISSION-LATENCY-INSTRUMENTATION-1 — architecture guards.
 * Timing only. Must not change relay, pricing, numbering, or persist semantics.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(__dirname, "../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

function orderCreateMutation(): string {
  const routers = read("server/routers.ts");
  const createStart = routers.indexOf("  create: publicProcedure");
  return routers.slice(
    createStart,
    routers.indexOf("  list: verifiedProcedure", createStart)
  );
}

describe("ORDER-SUBMISSION-LATENCY-INSTRUMENTATION-1", () => {
  it("wraps order.create with existing lifecycle ALS and stage phases", () => {
    const createFn = orderCreateMutation();
    expect(createFn).toContain("withOrderLifecycleLatency");
    expect(createFn).toContain('surface: "order.create"');
    expect(createFn).toContain("auth_ms");
    expect(createFn).toContain("table_ms");
    expect(createFn).toContain("session_ms");
    expect(createFn).toContain("{ awaitRelay: false }");
    expect(createFn).not.toContain("awaitRelay: true");
    expect(createFn).not.toContain("setTimeout");
  });

  it("times PlaceOrder pricing and number allocation without changing calls", () => {
    const place = read("server/order/application/PlaceOrderService.ts");
    expect(place).toContain("pricing_ms");
    expect(place).toContain("number_ms");
    expect(place).toContain("timeOrderLifecyclePhase");
    expect(place).toContain("this.pricing.resolveLines");
    expect(place).toContain("this.orderNumbers.allocate");
  });

  it("splits persist / outbox / commit on new-order transactional save", () => {
    const repo = read(
      "server/order/infrastructure/persistence/DrizzleOrderRepository.ts"
    );
    expect(repo).toContain("persist_ms");
    expect(repo).toContain("outbox_ms");
    expect(repo).toContain("commit_ms");
    expect(repo).toContain("restaurant_lock_ms");
    expect(repo).toContain("order_insert_ms");
    expect(repo).toContain("order_lines_ms");
    expect(repo).toContain("accept_update_ms");
    expect(repo).toContain("appendInTransaction");
    expect(repo).toContain("requireRestaurantRowForOrderPersist");
  });

  it("Table checkout correlates lifecycleTraceId on order.create only", () => {
    const provider = read(
      "client/src/lib/ordering-client/checkout/OrderingCheckoutProvider.tsx"
    );
    expect(provider).toContain("beginOrderLifecycleClientTrace");
    expect(provider).toContain("lifecycleTraceId");
    expect(provider).toContain('surface: "order.create"');
    expect(provider).toContain("createOrderMutation.mutateAsync");
    expect(provider).not.toContain("setTimeout");
  });
});
