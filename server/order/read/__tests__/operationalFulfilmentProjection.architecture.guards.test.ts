import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("OPERATIONAL-FULFILMENT-PROJECTION-1 architecture guards", () => {
  it("ActiveOrderItemDto carries projected fulfilment fields", () => {
    const contracts = read(
      "server/order/read/domain/contracts/queryContracts.ts"
    );
    expect(contracts).toContain("serviceMode: string");
    expect(contracts).toContain("fulfilmentAnchorType: string");
    expect(contracts).toContain("fulfilmentLabel: string");
  });

  it("mapActiveOrderItemDto resolves fulfilment via shared projection helper", () => {
    const mapper = read(
      "server/order/read/presentation/mapActiveOrderItemDto.ts"
    );
    expect(mapper).toContain("resolveFulfilmentProjection");
    expect(mapper).not.toContain("resolveOperationalSession");
    expect(mapper).not.toContain("IdentityPlaceOrder");
  });

  it("Kitchen and Print DTOs pass through projected fulfilment", () => {
    const kitchen = read(
      "server/kitchen/read/contracts/kitchenQueryContracts.ts"
    );
    const print = read(
      "server/print-workspace/read/contracts/printWorkspaceQueryContracts.ts"
    );
    expect(kitchen).toContain("fulfilmentLabel: string");
    expect(print).toContain("fulfilmentLabel: string");
  });

  it("projection schema version bumped for fulfilment stamps", () => {
    const ids = read("server/order/read/domain/contracts/projectionIds.ts");
    expect(ids).toContain("ORDER_READ_PROJECTION_SCHEMA_VERSION = 6");
  });

  it("additive migration exists for write + read fulfilment columns", () => {
    const sql = read("drizzle/0065_order_fulfilment_projection.sql");
    expect(sql).toContain("fulfilmentLabel");
    expect(sql).toContain("order_read_orders");
    expect(sql).toContain("`orders`");
  });
});
