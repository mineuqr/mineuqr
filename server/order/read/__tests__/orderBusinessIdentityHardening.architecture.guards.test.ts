import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../..");

function read(rel: string) {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("ORDER-BUSINESS-IDENTITY-HARDENING-1 architecture guards", () => {
  it("keeps business identity outside domain and runtime", () => {
    const aggregate = read("server/order/domain/aggregate/Order.ts");
    const events = read("server/order/domain/events/OrderDomainEvents.ts");
    const actor = read("server/order/domain/value-objects/OrderActor.ts");
    expect(aggregate).not.toMatch(/businessDay|dailyDisplayNumber|displayReference/);
    expect(events).not.toMatch(/businessDay|dailyDisplayNumber|displayReference/);
    expect(actor).not.toMatch(/businessDay|dailyDisplayNumber|displayReference/);
  });

  it("centralizes retry policy and mysql error classification", () => {
    const retryPolicy = read(
      "server/order/business-identity/config/businessIdentityRetryPolicy.ts"
    );
    const mysqlErrors = read(
      "server/order/business-identity/infrastructure/mysqlInfrastructureErrors.ts"
    );
    const allocator = read(
      "server/order/business-identity/infrastructure/DrizzleBusinessIdentityAllocator.ts"
    );
    expect(retryPolicy).toContain("BUSINESS_IDENTITY_RETRY_POLICY");
    expect(mysqlErrors).toContain("isRetryableBusinessIdentityInfrastructureError");
    expect(allocator).toContain("runBusinessIdentityWithRetry");
  });

  it("uses row locks and consistent lock ordering for historic assignment", () => {
    const allocator = read(
      "server/order/business-identity/infrastructure/DrizzleBusinessIdentityAllocator.ts"
    );
    expect(allocator).toContain('FOR UPDATE');
    expect(allocator).toContain('.for("update")');
    expect(allocator).toMatch(/INSERT INTO order_business_day_sequences[\s\S]*FOR UPDATE/);
  });

  it("uses LAST_INSERT_ID(1) on hot-path first business-day insert", () => {
    const allocator = read(
      "server/order/business-identity/infrastructure/DrizzleBusinessIdentityAllocator.ts"
    );
    expect(allocator).toContain(
      "ON DUPLICATE KEY UPDATE last_number = LAST_INSERT_ID(last_number + 1)"
    );
    expect(allocator).toContain(
      "VALUES (${input.restaurantId}, ${businessDay}, ${identityScope}, LAST_INSERT_ID(1))"
    );
    expect(allocator).toContain("SELECT LAST_INSERT_ID() AS n");
    expect(allocator).not.toMatch(
      /VALUES \(\$\{input\.restaurantId\}, \$\{businessDay\}, 1\)\s*\n\s*ON DUPLICATE KEY UPDATE/
    );
  });

  it("registers structured observability events in ops taxonomy", () => {
    const taxonomy = read("server/_core/opsTaxonomy.ts");
    expect(taxonomy).toContain("business_identity_assignment_started");
    expect(taxonomy).toContain("business_identity_assignment_completed");
    expect(taxonomy).toContain("business_identity_assignment_retry");
    expect(taxonomy).toContain("business_identity_deadlock");
    expect(taxonomy).toContain("business_identity_unique_constraint_retry");
    expect(taxonomy).toContain("business_identity_failed");
  });

  it("retries infrastructure failures in order repository, then fails the create closed", () => {
    const repository = read("server/order/infrastructure/persistence/DrizzleOrderRepository.ts");
    expect(repository).toContain("BUSINESS_IDENTITY_RETRY_POLICY");
    expect(repository).toContain("isRetryableBusinessIdentityInfrastructureError");
    // ORDER-CREATE-LEGACY-FALLBACK-OUTBOX-SAFETY-1 — exhausted retries must not
    // commit an Order without its OrderCreated Outbox event.
    expect(repository).not.toContain("insertLegacy");
    expect(repository).toContain("logOrderCreatePersistenceFailed");
  });

  it("BUSINESS-IDENTITY-LATENCY-REMEDIATION-1 stamps identity on INSERT and keeps LAST_INSERT_ID", () => {
    const allocator = read(
      "server/order/business-identity/infrastructure/DrizzleBusinessIdentityAllocator.ts"
    );
    const repository = read("server/order/infrastructure/persistence/DrizzleOrderRepository.ts");
    const lock = read("server/db/restaurantRowLock.ts");
    const occupancy = read("server/subscription-runtime/commercialLimitOccupancy.ts");
    const cascade = read("server/db/cascadeDeletes.ts");
    const hot = allocator.slice(0, allocator.indexOf("async ensureAssigned("));

    expect(hot).toContain("SELECT LAST_INSERT_ID() AS n");
    expect(hot).toContain("LAST_INSERT_ID(last_number + 1)");
    expect(hot).toContain("LAST_INSERT_ID(1)");
    expect(hot).not.toContain(".update(orders)");
    expect(hot).not.toContain("insertId");
    expect(hot).not.toContain("RETURNING");
    expect(hot).not.toContain("getWorkingHours");
    expect(allocator).toContain("async ensureAssigned(");
    expect(allocator).toContain(".for(\"update\")");
    const historic = allocator.slice(allocator.indexOf("async ensureAssigned("));
    expect(historic).toContain(".update(orders)");
    expect(historic).toContain("COUNT(*)");
    expect(historic).toContain("getWorkingHours");
    expect(historic).toContain("GREATEST(last_number");

    expect(repository).toContain("requireRestaurantRowForOrderPersist");
    expect(repository).toContain("workingHours: lockedRestaurant.workingHours");
    expect(repository).toContain("businessDay: businessIdentity.businessDay");
    expect(repository).toContain("dailyDisplayNumber: businessIdentity.dailyDisplayNumber");
    expect(repository).toContain("identityScope: businessIdentity.identityScope");
    expect(repository).not.toContain("resolveBusinessDayKey");
    expect(repository).not.toContain("setImmediate");
    expect(repository).not.toContain("RETURNING");

    const allocateAt = repository.indexOf("allocateForNewOrder");
    const insertAt = repository.indexOf("tx.insert(orders)");
    expect(allocateAt).toBeGreaterThan(0);
    expect(insertAt).toBeGreaterThan(allocateAt);

    expect(lock).toContain("SELECT id, userId\n    FROM restaurants");
    expect(lock).toContain("SELECT id, userId, workingHours");
    expect(occupancy).not.toContain("workingHours");
    expect(occupancy).not.toContain("lockRestaurantRowForOrderPersist");
    expect(cascade).not.toContain("lockRestaurantRowForOrderPersist");
    expect(cascade).toContain("lockRestaurantRowForUpdate(tx, restaurantId)");
  });

  it("passes worker and correlation context from projection materializer", () => {
    const materializer = read(
      "server/order/read/projections/materializers/OrderReadProjectionMaterializer.ts"
    );
    expect(materializer).toContain("correlationId: eventId");
    expect(materializer).toContain("BUSINESS_IDENTITY_WORKER_ID");
  });

  it("does not leak business identity allocation into presentation UI components", () => {
    const card = read("client/src/components/kitchen/KitchenExecutionCard.tsx");
    const viewModels = read("client/src/lib/kitchen/viewModels.ts");
    expect(card).not.toContain("resolveBusinessDayKey");
    expect(card).not.toContain("dailyDisplayNumber");
    expect(viewModels).toContain("displayReference");
  });
});
