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

  it("preserves hot path LAST_INSERT_ID allocation unchanged", () => {
    const allocator = read(
      "server/order/business-identity/infrastructure/DrizzleBusinessIdentityAllocator.ts"
    );
    expect(allocator).toContain(
      "ON DUPLICATE KEY UPDATE last_number = LAST_INSERT_ID(last_number + 1)"
    );
    expect(allocator).toContain("SELECT LAST_INSERT_ID() AS n");
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

  it("retries infrastructure failures in order repository before legacy fallback", () => {
    const repository = read("server/order/infrastructure/persistence/DrizzleOrderRepository.ts");
    expect(repository).toContain("BUSINESS_IDENTITY_RETRY_POLICY");
    expect(repository).toContain("isRetryableBusinessIdentityInfrastructureError");
    expect(repository).toContain("insertLegacy");
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
