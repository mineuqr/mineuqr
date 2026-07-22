/**
 * SPLIT-PAYMENT-API-1 — architecture guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("SPLIT-PAYMENT-API-1 architecture guards", () => {
  it("router is query-only and uses restaurant access", () => {
    const router = read(
      "server/operational-session/check/api/splitPaymentReadRouter.ts"
    );
    expect(router).toContain("SPLIT-PAYMENT-API-1");
    expect(router).toContain("verifiedProcedure");
    expect(router).toContain("assertRestaurantAccess");
    expect(router).toContain("splitPaymentReadService");
    expect(router).toContain(".query(");
    expect(router).not.toContain(".mutation(");
    expect(router).not.toContain("CheckService");
    expect(router).not.toContain("splitPaymentRepository");
    expect(router).not.toContain("applySplitPayment");
    expect(router).not.toContain("materializeSplitPaymentProjections");
  });

  it("read service queries Projection store only", () => {
    const service = read(
      "server/operational-session/check/api/splitPaymentReadService.ts"
    );
    expect(service).toContain("SplitPaymentProjectionStore");
    expect(service).toContain("findPaymentByIdentity");
    expect(service).toContain("listPaymentsByCheck");
    expect(service).not.toContain("CheckService");
    expect(service).not.toContain("splitPaymentRepository");
    expect(service).not.toContain("getDb");
    expect(service).not.toContain("materializeSplitPaymentProjections");
  });

  it("DTOs do not expose Domain or Persistence types", () => {
    const dtos = read(
      "server/operational-session/check/api/splitPaymentApiDtos.ts"
    );
    expect(dtos).toContain("SplitPaymentDto");
    expect(dtos).toContain("projectionRevision");
    expect(dtos).toContain("projectedAt");
    expect(dtos).not.toContain("SplitPaymentDomainEvent");
    expect(dtos).not.toContain("SelectCheckSplitPayment");
    expect(dtos).not.toContain("OperationalCheck");
    expect(dtos).not.toContain("type PaymentAttempt");
    expect(dtos).not.toContain("from \"../splitPayment");
  });

  it("exposes independent API contract versioning", () => {
    const dtos = read(
      "server/operational-session/check/api/splitPaymentApiDtos.ts"
    );
    expect(dtos).toContain("SPLIT_PAYMENT_API_CONTRACT_VERSION");
    expect(dtos).toContain("apiContractVersion");
    expect(dtos).toContain("API Versioning Governance");
    expect(dtos).toContain("independent");
    expect(dtos).toContain("additive");

    const mapper = read(
      "server/operational-session/check/api/splitPaymentApiMapper.ts"
    );
    expect(mapper).toContain("SPLIT_PAYMENT_API_CONTRACT_VERSION");
    expect(mapper).toContain("apiContractVersion: SPLIT_PAYMENT_API_CONTRACT_VERSION");

    const contract = read(
      "shared/operational-session/check/splitPayment/projection/splitPaymentProjectionContract.ts"
    );
    expect(contract).toContain("SPLIT_PAYMENT_PROJECTION_SCHEMA_VERSION");
    expect(contract).not.toContain("SPLIT_PAYMENT_API_CONTRACT_VERSION");
  });

  it("mounted on appRouter as splitPayment", () => {
    const routers = read("server/routers.ts");
    expect(routers).toContain("splitPaymentReadRouter");
    expect(routers).toContain("splitPayment: splitPaymentReadRouter");
  });

  it("does not redesign Projection, Domain, Persistence, or Integration", () => {
    const projectionBuilder = read(
      "shared/operational-session/check/splitPayment/projection/splitPaymentProjectionBuilder.ts"
    );
    expect(projectionBuilder).toContain("SPLIT-PAYMENT-PROJECTION-1");
    expect(projectionBuilder).not.toContain("SPLIT-PAYMENT-API-1");

    const integration = read(
      "server/operational-session/check/checkSplitPaymentIntegration.ts"
    );
    expect(integration).toContain("SPLIT-PAYMENT-INTEGRATION-1");
    expect(integration).not.toContain("splitPaymentReadRouter");

    const domainIndex = read(
      "shared/operational-session/check/splitPayment/index.ts"
    );
    expect(domainIndex).not.toContain("splitPaymentReadRouter");
  });
});
