/**
 * ORDER-SETTLEMENT-PROJECTION-1 — architecture guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("ORDER-SETTLEMENT-PROJECTION-1 architecture guards", () => {
  it("projection contracts are read-model only with versioning", () => {
    const contract = read(
      "shared/operational-session/check/orderSettlement/projection/orderSettlementProjectionContract.ts"
    );
    expect(contract).toContain("ORDER-SETTLEMENT-PROJECTION-1");
    expect(contract).toContain("ORDER_SETTLEMENT_PROJECTION_SCHEMA_VERSION");
    expect(contract).toContain("projectionRevision");
    expect(contract).toContain("OS-P-01-order-settlement");
    expect(contract).toContain("Not a source of business truth");
    expect(contract).not.toContain("createOrderSettlement");
    expect(contract).not.toContain("applyFullSettlement");
  });

  it("builders map Write Model fields without money math or invariants", () => {
    const builder = read(
      "shared/operational-session/check/orderSettlement/projection/orderSettlementProjectionBuilder.ts"
    );
    expect(builder).toContain("buildOrderSettlementProjection");
    expect(builder).toContain("buildOrderSettlementProjectionRevision");
    expect(builder).not.toContain("calculateOutstandingAmount");
    expect(builder).not.toContain("assertTransitionAllowed");
    expect(builder).not.toContain("assertMoneyInvariants");
    expect(builder).not.toContain("parseOrderSettlementMoney");
    expect(builder).not.toContain("getDb");
    expect(builder).not.toContain("insertOrderSettlement");
  });

  it("materializer rebuilds from committed state and claims events only", () => {
    const materializer = read(
      "server/operational-session/check/read/orderSettlementProjectionMaterializer.ts"
    );
    expect(materializer).toContain("committedSettlements");
    expect(materializer).toContain("buildOrderSettlementProjection");
    expect(materializer).toContain("buildOrderSettlementProjectionEventClaimKey");
    expect(materializer).toContain("tryMaterializeOrderSettlementProjections");
    expect(materializer).not.toContain("EventBus");
    expect(materializer).not.toContain("outbox");
    expect(materializer).not.toContain("inbox");
    expect(materializer).not.toContain("finalizeCheckOutcome");
    expect(materializer).not.toContain("insertOrderSettlement");
    expect(materializer).not.toContain("applyFullSettlement");
  });

  it("does not modify Integration or Write Model Aggregate", () => {
    const integration = read(
      "server/operational-session/check/checkOrderSettlementIntegration.ts"
    );
    expect(integration).toContain("ORDER-SETTLEMENT-INTEGRATION-1");
    expect(integration).not.toContain("materializeOrderSettlementProjections");
    expect(integration).not.toContain("InMemoryOrderSettlementProjectionStore");

    const checkService = read(
      "server/operational-session/check/CheckService.ts"
    );
    expect(checkService).not.toContain("materializeOrderSettlementProjections");
    expect(checkService).not.toContain("orderSettlementProjection");
  });

  it("projection store is Read Model only — no financial mutation APIs", () => {
    const store = read(
      "server/operational-session/check/read/orderSettlementProjectionStore.ts"
    );
    expect(store).toContain("OrderSettlementProjectionStore");
    expect(store).not.toContain("createOrderSettlement");
    expect(store).not.toContain("finalizeCheckOutcome");
    expect(store).not.toContain("db.transaction");
  });

  it("Domain and Persistence programs remain untouched markers", () => {
    const domain = read(
      "shared/operational-session/check/orderSettlement/orderSettlementCommands.ts"
    );
    expect(domain).toContain("ORDER-SETTLEMENT-DOMAIN-1");
    const persistence = read(
      "server/operational-session/check/orderSettlementRepository.ts"
    );
    expect(persistence).toContain("ORDER-SETTLEMENT-PERSISTENCE-1");
    expect(persistence).not.toContain("ORDER-SETTLEMENT-PROJECTION-1");
  });
});
