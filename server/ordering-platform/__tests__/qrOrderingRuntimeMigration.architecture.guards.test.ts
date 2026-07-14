import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("QR-ORDERING-RUNTIME-MIGRATION-1 server architecture guards", () => {
  it("registers QR runtime loader and router ownership", () => {
    const ownership = read("server/ordering-platform/orderingPlatformOwnership.ts");
    expect(ownership).toContain("ORDERING_PLATFORM_QR_RUNTIME_LOADER");
    expect(ownership).toContain("ORDERING_PLATFORM_QR_RUNTIME_ROUTER_ENTRY");
  });

  it("QR loader does not call factory or freeze — materializer owns composition", () => {
    const loader = read("server/ordering-platform/loadQrOrderingRuntimeSources.ts");
    expect(loader).toContain("OrderingRuntimeMaterializationRequest");
    expect(loader).not.toContain("freezeOrderingRuntimeContext");
    expect(loader).not.toContain("OrderingRuntimeContextFactory");
    expect(loader).not.toContain("orderingRuntimeMaterializer");
  });

  it("getQrOrderingRuntime materializes via OrderingRuntimeMaterializer only", () => {
    const service = read("server/ordering-platform/getQrOrderingRuntime.ts");
    expect(service).toContain("materializer.materialize");
    expect(service).toContain("loadQrOrderingRuntimeSources");
    expect(service).not.toContain("freezeOrderingRuntimeContext");
  });

  it("additive ordering router is mounted without replacing order.create", () => {
    const orderingRouter = read("server/orderingRouter.ts");
    const routers = read("server/routers.ts");
    expect(orderingRouter).toContain("getRuntimeBySlug");
    expect(routers).toContain("ordering: orderingRouter");
    expect(routers).toContain("placeOrderService.execute");
  });
});
