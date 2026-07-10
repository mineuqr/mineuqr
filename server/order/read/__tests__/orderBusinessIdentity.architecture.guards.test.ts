import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../..");

function read(rel: string) {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("ORDER-IDENTITY-AND-BUSINESS-DAY-1 architecture guards", () => {
  it("keeps business identity outside the Order aggregate", () => {
    const aggregate = read("server/order/domain/aggregate/Order.ts");
    const events = read("server/order/domain/events/OrderDomainEvents.ts");
    expect(aggregate).not.toContain("businessDay");
    expect(aggregate).not.toContain("dailyDisplayNumber");
    expect(aggregate).not.toContain("displayReference");
    expect(events).not.toMatch(/businessDay|dailyDisplayNumber|displayReference/);
  });

  it("allocates business identity in application/infrastructure only", () => {
    const allocator = read(
      "server/order/business-identity/infrastructure/DrizzleBusinessIdentityAllocator.ts"
    );
    const repository = read("server/order/infrastructure/persistence/DrizzleOrderRepository.ts");
    expect(allocator).toContain("allocateForNewOrder");
    expect(repository).toContain("businessIdentityAllocator");
    expect(repository).not.toContain("resolveBusinessDayKey");
  });

  it("formats display references in business-identity presentation layer", () => {
    const formatter = read(
      "server/order/business-identity/application/DisplayReferenceFormatter.ts"
    );
    const domain = read("server/order/domain/aggregate/Order.ts");
    expect(formatter).toContain("formatDisplayReference");
    expect(domain).not.toContain("formatDisplayReference");
  });

  it("exposes display identity through read model DTOs", () => {
    const contracts = read("server/order/read/domain/contracts/queryContracts.ts");
    const mapper = read("server/order/read/presentation/mapActiveOrderItemDto.ts");
    expect(contracts).toContain("displayOrderNumber");
    expect(contracts).toContain("displayReference");
    expect(contracts).toContain("businessDay");
    expect(mapper).toContain("resolveOrderDisplayIdentity");
  });

  it("keeps operational screen on read projections with display identity", () => {
    const kitchen = read("server/kitchen/read/services/KitchenTicketComposer.ts");
    const viewModels = read("client/src/lib/kitchen/viewModels.ts");
    expect(kitchen).toContain("displayReference");
    expect(viewModels).toContain("displayReference");
  });

  it("preserves legacy orderNumber for printing compatibility", () => {
    const payload = read("server/printing/domain/PrintPayload.ts");
    const serializer = read("server/print-connector/runtime/PrintPayloadTextSerializer.ts");
    expect(payload).toContain("orderNumber");
    expect(payload).toContain("displayReference");
    expect(serializer).toContain("displayReference");
  });
});
