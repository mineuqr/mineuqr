import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../..");

function read(rel: string) {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("ORDER-PROJECTION-FANOUT-REMEDIATION-1 architecture guards", () => {
  it("keeps four RA-06 rematerializing consumers and does not merge registrations", () => {
    const consumers = read(
      "server/order/read/projections/consumers/createOrderReadProjectionConsumers.ts"
    );
    const composition = read("server/order/read/readComposition.ts");

    expect(consumers).toContain('name: "OwnerOrdersProjectionConsumer"');
    expect(consumers).toContain('name: "ActiveOrdersProjectionConsumer"');
    expect(consumers).toContain('name: "OrderDetailsProjectionConsumer"');
    expect(consumers).toContain('name: "PublicOrderStatusProjectionConsumer"');
    expect(consumers).toContain("OrderLifecycleStageChanged");
    expect(consumers).toContain("ensureSharedOrderRematerialized");
    expect(consumers).not.toContain("m.syncOrderProjections(");

    expect(composition).toContain("executionPolicy: \"parallel\"");
    expect(composition).not.toContain("executionPolicy: \"sequential\"");
  });

  it("keeps shared rematerialization behind an in-process once-per-event gate", () => {
    const materializer = read(
      "server/order/read/projections/materializers/OrderReadProjectionMaterializer.ts"
    );
    const gate = read(
      "server/order/read/projections/materializers/SharedOrderRematerializationGate.ts"
    );

    expect(materializer).toContain("ensureSharedOrderRematerialized");
    expect(materializer).toContain("SharedOrderRematerializationGate");
    expect(materializer).toContain("rematerializeOrderProjections");
    expect(gate).toContain("inflight");
    expect(gate).toContain("eventId");
  });

  it("keeps P-06 and P-04 off the shared rematerialization path", () => {
    const consumers = read(
      "server/order/read/projections/consumers/createOrderReadProjectionConsumers.ts"
    );
    const kpiHandle = consumers.slice(
      consumers.indexOf('name: "OperationalKpiProjectionConsumer"'),
      consumers.indexOf('name: "OrderAnalyticsProjectionConsumer"')
    );
    const timelineHandle = consumers.slice(
      consumers.indexOf('name: "OrderTimelineProjectionConsumer"'),
      consumers.indexOf('name: "OperationalKpiProjectionConsumer"')
    );

    expect(kpiHandle).toContain("adjustOperationalKpi");
    expect(kpiHandle).not.toContain("ensureSharedOrderRematerialized");
    expect(timelineHandle).toContain("appendTimeline");
    expect(timelineHandle).not.toContain("ensureSharedOrderRematerialized");
    expect(timelineHandle).not.toContain("OrderLifecycleStageChanged");
  });

  it("keeps P-02 and P-11 realtime hints as post-processing after shared rematerialization", () => {
    const consumers = read(
      "server/order/read/projections/consumers/createOrderReadProjectionConsumers.ts"
    );
    const p02 = consumers.slice(
      consumers.indexOf('name: "ActiveOrdersProjectionConsumer"'),
      consumers.indexOf('name: "OrderDetailsProjectionConsumer"')
    );
    const p11 = consumers.slice(consumers.indexOf('name: "PublicOrderStatusProjectionConsumer"'));

    expect(p02.indexOf("ensureSharedOrderRematerialized")).toBeGreaterThan(-1);
    expect(p02.indexOf("publishOrdersRealtimeHintAfterProjection")).toBeGreaterThan(
      p02.indexOf("ensureSharedOrderRematerialized")
    );
    expect(p11.indexOf("ensureSharedOrderRematerialized")).toBeGreaterThan(-1);
    expect(p11.indexOf("publishCustomerRealtimeHintAfterProjection")).toBeGreaterThan(
      p11.indexOf("ensureSharedOrderRematerialized")
    );
  });

  it("does not wrap persistFromSource as a four-way consumer race or add line-item ODKU", () => {
    const persist = read(
      "server/order/read/infrastructure/persistence/drizzle/DrizzleOrderReadProjectionStore.ts"
    );
    const persisting = read(
      "server/order/read/infrastructure/persistence/PersistingOrderReadProjectionRepositories.ts"
    );
    const persistFn = persist.slice(persist.indexOf("async persistFromSource("));

    expect(persisting).toContain("await drizzle.persistFromSource(source, record.lastEventId)");
    expect(persistFn).toContain(".delete(orderReadOrderLineItems)");
    expect(persistFn).toContain(".insert(orderReadOrderLineItems)");
    const lineInsert = persistFn.slice(persistFn.indexOf(".insert(orderReadOrderLineItems)"));
    const publicInsert = lineInsert.indexOf(".insert(orderReadPublicOrderStatus)");
    const lineBlock = publicInsert >= 0 ? lineInsert.slice(0, publicInsert) : lineInsert;
    expect(lineBlock).not.toContain("onDuplicateKeyUpdate");
  });

  it("does not reopen identity-on-create or cashier awaitRelay", () => {
    const repository = read("server/order/infrastructure/persistence/DrizzleOrderRepository.ts");
    const sale = read("server/pos/services/PosSaleService.ts");
    const allocator = read(
      "server/order/business-identity/infrastructure/DrizzleBusinessIdentityAllocator.ts"
    );

    expect(repository).toContain("allocateForNewOrder");
    expect(repository).not.toContain("ensureAssigned");
    expect(allocator).toContain("async ensureAssigned(");
    expect(sale).toContain("awaitRelay: false");
    expect(sale).not.toContain("awaitRelay: true");
  });
});
