/**
 * ORDER-SETTLEMENT-API-1 — architecture guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("ORDER-SETTLEMENT-API-1 architecture guards", () => {
  it("router is query-only and uses restaurant access", () => {
    const router = read(
      "server/operational-session/check/api/orderSettlementReadRouter.ts"
    );
    expect(router).toContain("ORDER-SETTLEMENT-API-1");
    expect(router).toContain("verifiedProcedure");
    expect(router).toContain("assertRestaurantAccess");
    expect(router).toContain("orderSettlementReadService");
    expect(router).toContain(".query(");
    expect(router).not.toContain(".mutation(");
    expect(router).not.toContain("createOrderSettlement");
    expect(router).not.toContain("applyFullSettlement");
    expect(router).not.toContain("finalizeOpenCheckById");
    expect(router).not.toContain("insertOrderSettlement");
    expect(router).not.toContain("materializeOrderSettlementProjections");
  });

  it("read service queries Projection store only", () => {
    const service = read(
      "server/operational-session/check/api/orderSettlementReadService.ts"
    );
    expect(service).toContain("OrderSettlementProjectionStore");
    expect(service).toContain("findByIdentity");
    expect(service).toContain("listByCheck");
    expect(service).not.toContain("CheckService");
    expect(service).not.toContain("orderSettlementRepository");
    expect(service).not.toContain("createOrderSettlement");
    expect(service).not.toContain("getDb");
    expect(service).not.toContain("materializeOrderSettlementProjections");
  });

  it("DTOs do not expose Domain or Persistence types", () => {
    const dtos = read(
      "server/operational-session/check/api/orderSettlementApiDtos.ts"
    );
    expect(dtos).toContain("OrderSettlementDto");
    expect(dtos).toContain("projectionRevision");
    expect(dtos).not.toContain("OrderSettlementDomainEvent");
    expect(dtos).not.toContain("SelectCheckOrderSettlement");
    expect(dtos).not.toContain("OperationalCheck");
  });

  it("mounted on appRouter as orderSettlement", () => {
    const routers = read("server/routers.ts");
    expect(routers).toContain("orderSettlementReadRouter");
    expect(routers).toContain("orderSettlement: orderSettlementReadRouter");
  });

  it("does not redesign Projection or Integration", () => {
    const projectionBuilder = read(
      "shared/operational-session/check/orderSettlement/projection/orderSettlementProjectionBuilder.ts"
    );
    expect(projectionBuilder).toContain("ORDER-SETTLEMENT-PROJECTION-1");
    expect(projectionBuilder).not.toContain("ORDER-SETTLEMENT-API-1");

    const integration = read(
      "server/operational-session/check/checkOrderSettlementIntegration.ts"
    );
    expect(integration).toContain("ORDER-SETTLEMENT-INTEGRATION-1");
    expect(integration).not.toContain("orderSettlementReadRouter");
  });
});
