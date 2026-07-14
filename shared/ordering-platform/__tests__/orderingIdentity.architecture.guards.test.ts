import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("ORDER-IDENTITY-RUNTIME-1 architecture guards", () => {
  it("shared identity contract owns Service Mode and Fulfilment Anchor vocabulary", () => {
    const contract = read("shared/ordering-platform/orderingIdentityContract.ts");
    expect(contract).toContain("ORDERING_SERVICE_MODES");
    expect(contract).toContain("table_service");
    expect(contract).toContain("ORDERING_FULFILMENT_ANCHOR_TYPES");
    expect(contract).toContain('anchorType: "table"');
    expect(contract).toContain("createTableOrderIdentity");
    expect(contract).toContain("OrderingOperationalSessionIdentity");
  });

  it("OrderingRuntimeContext projects orderIdentity policies", () => {
    const runtime = read("shared/ordering-platform/orderingRuntimeContract.ts");
    expect(runtime).toContain("orderIdentity");
    expect(runtime).toContain("OrderingRuntimeOrderIdentityPolicies");
    expect(runtime).toContain("identity: OrderingOrderIdentity");
  });

  it("PlaceOrder pipeline consumes identity and dual-writes table fields", () => {
    const service = read("server/order/application/PlaceOrderService.ts");
    const router = read("server/routers.ts");
    expect(service).toContain("resolvePlaceOrderPersistFields");
    expect(service).toContain("identity?");
    expect(router).toContain("createTableOrderIdentity");
    expect(router).toContain("identity: orderIdentity");
  });

  it("does not invent channel-specific PlaceOrder services", () => {
    const service = read("server/order/application/PlaceOrderService.ts");
    expect(service).not.toContain("KioskPlaceOrder");
    expect(service).not.toContain("CounterPlaceOrder");
  });

  it("materializer supplies default table_service identity policies", () => {
    const materializer = read(
      "server/ordering-platform/OrderingRuntimeMaterializer.ts"
    );
    expect(materializer).toContain("DEFAULT_ORDERING_RUNTIME_ORDER_IDENTITY_POLICIES");
    expect(materializer).toContain("orderIdentity");
  });
});
