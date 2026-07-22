/**
 * SPLIT-PAYMENT-PROJECTION-1 — architecture guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("SPLIT-PAYMENT-PROJECTION-1 architecture guards", () => {
  it("projection contracts are read-model only with versioning", () => {
    const contract = read(
      "shared/operational-session/check/splitPayment/projection/splitPaymentProjectionContract.ts"
    );
    expect(contract).toContain("SPLIT-PAYMENT-PROJECTION-1");
    expect(contract).toContain("SPLIT_PAYMENT_PROJECTION_SCHEMA_VERSION");
    expect(contract).toContain("projectionRevision");
    expect(contract).toContain("SP-P-01-split-payment");
    expect(contract).toContain("Not a source of business truth");
    expect(contract).not.toContain("createSplitPayment");
    expect(contract).not.toContain("allocatePayment");
  });

  it("builders map Write Model fields without money math or commands", () => {
    const builder = read(
      "shared/operational-session/check/splitPayment/projection/splitPaymentProjectionBuilder.ts"
    );
    expect(builder).toContain("buildSplitPaymentProjection");
    expect(builder).toContain("buildSplitPaymentProjectionRevision");
    expect(builder).not.toContain("parseSplitPaymentMoney");
    expect(builder).not.toContain("assertTransitionAllowed");
    expect(builder).not.toContain("assertCheckConservation");
    expect(builder).not.toContain("allocatePayment");
    expect(builder).not.toContain("createSplitPayment");
    expect(builder).not.toContain("getDb");
    expect(builder).not.toContain("insertSplitPayment");
  });

  it("materializer rebuilds from committed state and claims events only", () => {
    const materializer = read(
      "server/operational-session/check/read/splitPaymentProjectionMaterializer.ts"
    );
    expect(materializer).toContain("committedPayments");
    expect(materializer).toContain("buildSplitPaymentProjection");
    expect(materializer).toContain("buildSplitPaymentProjectionEventClaimKey");
    expect(materializer).toContain("tryMaterializeSplitPaymentProjections");
    expect(materializer).not.toContain("EventBus");
    expect(materializer).not.toContain("outbox");
    expect(materializer).not.toContain("inbox");
    expect(materializer).not.toContain("finalizeCheckOutcome");
    expect(materializer).not.toContain("insertSplitPayment");
    expect(materializer).not.toContain("applyPaymentOnCheck");
  });

  it("does not modify Integration or Write Model Aggregate", () => {
    const integration = read(
      "server/operational-session/check/checkSplitPaymentIntegration.ts"
    );
    expect(integration).toContain("SPLIT-PAYMENT-INTEGRATION-1");
    expect(integration).not.toContain("materializeSplitPaymentProjections");
    expect(integration).not.toContain("InMemorySplitPaymentProjectionStore");

    const checkService = read(
      "server/operational-session/check/CheckService.ts"
    );
    expect(checkService).not.toContain("materializeSplitPaymentProjections");
    expect(checkService).not.toContain("splitPaymentProjection");
  });

  it("projection store is Read Model only — no financial mutation APIs", () => {
    const store = read(
      "server/operational-session/check/read/splitPaymentProjectionStore.ts"
    );
    expect(store).toContain("SplitPaymentProjectionStore");
    expect(store).not.toContain("createSplitPayment");
    expect(store).not.toContain("finalizeCheckOutcome");
    expect(store).not.toContain("db.transaction");
  });

  it("Domain and Persistence programs remain untouched markers", () => {
    const domain = read(
      "shared/operational-session/check/splitPayment/splitPaymentCommands.ts"
    );
    expect(domain).toContain("SPLIT-PAYMENT-DOMAIN-1");
    expect(domain).not.toContain("SPLIT-PAYMENT-PROJECTION-1");
    const persistence = read(
      "server/operational-session/check/splitPaymentRepository.ts"
    );
    expect(persistence).toContain("SPLIT-PAYMENT-PERSISTENCE-1");
    expect(persistence).not.toContain("SPLIT-PAYMENT-PROJECTION-1");
  });
});
