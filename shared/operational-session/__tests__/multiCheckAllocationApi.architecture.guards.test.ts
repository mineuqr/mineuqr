/**
 * MULTI-CHECK-ALLOCATION-API-1 — architecture guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("MULTI-CHECK-ALLOCATION-API-1 architecture guards", () => {
  it("router uses verifiedProcedure and restaurant access for reads and writes", () => {
    const router = read(
      "server/operational-session/check/api/multiCheckAllocationRouter.ts"
    );
    expect(router).toContain("MULTI-CHECK-ALLOCATION-API-1");
    expect(router).toContain("verifiedProcedure");
    expect(router).toContain("assertRestaurantAccess");
    expect(router).toContain("multiCheckAllocationReadService");
    expect(router).toContain("multiCheckAllocationWriteService");
    expect(router).toContain(".query(");
    expect(router).toContain(".mutation(");
    expect(router).toContain("createAllocation");
    expect(router).toContain("getAllocation");
    expect(router).not.toContain("multiCheckAllocationRepository");
    expect(router).not.toContain("parseAllocationMoney");
    expect(router).not.toContain("createMultiCheckAllocation(");
  });

  it("read service queries Projection store only", () => {
    const service = read(
      "server/operational-session/check/api/multiCheckAllocationReadService.ts"
    );
    expect(service).toContain("MultiCheckAllocationProjectionStore");
    expect(service).toContain("findAllocationByIdentity");
    expect(service).toContain("listAllocationsBySourceCheck");
    expect(service).not.toContain("CheckService");
    expect(service).not.toContain("multiCheckAllocationRepository");
    expect(service).not.toContain("getDb");
    expect(service).not.toContain(
      "materializeMultiCheckAllocationProjections"
    );
  });

  it("write service delegates to CheckService Integration only", () => {
    const service = read(
      "server/operational-session/check/api/multiCheckAllocationWriteService.ts"
    );
    expect(service).toContain("createMultiCheckAllocationOnCheck");
    expect(service).toContain("reserveMultiCheckAllocationOnCheck");
    expect(service).toContain("applyMultiCheckAllocationOnCheck");
    expect(service).toContain("adjustMultiCheckAllocationOnCheck");
    expect(service).toContain("reverseMultiCheckAllocationOnCheck");
    expect(service).toContain("completeMultiCheckAllocationOnCheck");
    expect(service).toContain("cancelMultiCheckAllocationOnCheck");
    expect(service).not.toContain("multiCheckAllocationRepository");
    expect(service).not.toContain("parseAllocationMoney");
    expect(service).not.toContain("assertAllocationConservation");
    expect(service).not.toContain("createMultiCheckAllocation(");
  });

  it("DTOs do not expose Domain, Persistence, or internal revisions", () => {
    const dtos = read(
      "server/operational-session/check/api/multiCheckAllocationApiDtos.ts"
    );
    expect(dtos).toContain("MultiCheckAllocationDto");
    expect(dtos).toContain("projectionRevision");
    expect(dtos).toContain("projectedAt");
    expect(dtos).toContain("internal revision");
    expect(dtos).not.toContain("allocationRevision");
    expect(dtos).not.toContain("MultiCheckAllocationDomainEvent");
    expect(dtos).not.toContain("SelectMultiCheckAllocation");
    expect(dtos).not.toContain("OperationalCheck");
    expect(dtos).not.toContain('from "../multiCheckAllocation');
  });

  it("exposes independent API contract versioning", () => {
    const dtos = read(
      "server/operational-session/check/api/multiCheckAllocationApiDtos.ts"
    );
    expect(dtos).toContain("MULTI_CHECK_ALLOCATION_API_CONTRACT_VERSION");
    expect(dtos).toContain("apiContractVersion");
    expect(dtos).toContain("API Versioning Governance");
    expect(dtos).toContain("independent");
    expect(dtos).toContain("additive");

    const mapper = read(
      "server/operational-session/check/api/multiCheckAllocationApiMapper.ts"
    );
    expect(mapper).toContain("MULTI_CHECK_ALLOCATION_API_CONTRACT_VERSION");
    expect(mapper).toContain(
      "apiContractVersion: MULTI_CHECK_ALLOCATION_API_CONTRACT_VERSION"
    );

    const contract = read(
      "shared/operational-session/check/multiCheckAllocation/projection/multiCheckAllocationProjectionContract.ts"
    );
    expect(contract).toContain(
      "MULTI_CHECK_ALLOCATION_PROJECTION_SCHEMA_VERSION"
    );
    expect(contract).not.toContain(
      "MULTI_CHECK_ALLOCATION_API_CONTRACT_VERSION"
    );
  });

  it("mounted on appRouter as multiCheckAllocation", () => {
    const routers = read("server/routers.ts");
    expect(routers).toContain("multiCheckAllocationRouter");
    expect(routers).toContain(
      "multiCheckAllocation: multiCheckAllocationRouter"
    );
  });

  it("does not redesign Projection, Domain, Persistence, or Integration", () => {
    const projectionBuilder = read(
      "shared/operational-session/check/multiCheckAllocation/projection/multiCheckAllocationProjectionBuilder.ts"
    );
    expect(projectionBuilder).toContain(
      "MULTI-CHECK-ALLOCATION-PROJECTION-1"
    );
    expect(projectionBuilder).not.toContain("MULTI-CHECK-ALLOCATION-API-1");

    const integration = read(
      "server/operational-session/check/checkMultiCheckAllocationIntegration.ts"
    );
    expect(integration).toContain("MULTI-CHECK-ALLOCATION-INTEGRATION-1");
    expect(integration).not.toContain("multiCheckAllocationRouter");

    const domainIndex = read(
      "shared/operational-session/check/multiCheckAllocation/index.ts"
    );
    expect(domainIndex).not.toContain("multiCheckAllocationRouter");
  });
});
