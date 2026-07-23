/**
 * MULTI-CHECK-ALLOCATION-PROJECTION-1 — architecture guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("MULTI-CHECK-ALLOCATION-PROJECTION-1 architecture guards", () => {
  it("projection contracts are read-model only with snapshot governance", () => {
    const contract = read(
      "shared/operational-session/check/multiCheckAllocation/projection/multiCheckAllocationProjectionContract.ts"
    );
    expect(contract).toContain("MULTI-CHECK-ALLOCATION-PROJECTION-1");
    expect(contract).toContain(
      "MULTI_CHECK_ALLOCATION_PROJECTION_SCHEMA_VERSION"
    );
    expect(contract).toContain("projectionRevision");
    expect(contract).toContain("allocationRevision");
    expect(contract).toContain("MultiCheckAllocationCommittedSnapshot");
    expect(contract).toContain("MCA-P-01-multi-check-allocation");
    expect(contract).toContain("Not a source of business truth");
    expect(contract).toContain("MUST NEVER merge");
    expect(contract).toContain("completely replaces");
    expect(contract).not.toContain("createMultiCheckAllocation");
    expect(contract).not.toContain("applyAllocation");
    expect(contract).not.toContain("parseAllocationMoney");
  });

  it("builders map Write Model fields without money math or commands", () => {
    const builder = read(
      "shared/operational-session/check/multiCheckAllocation/projection/multiCheckAllocationProjectionBuilder.ts"
    );
    expect(builder).toContain("buildMultiCheckAllocationProjection");
    expect(builder).toContain("buildMultiCheckAllocationProjectionRevision");
    expect(builder).toContain(
      "assertMultiCheckAllocationProjectionSnapshotCoherent"
    );
    expect(builder).not.toContain("parseAllocationMoney");
    expect(builder).not.toContain("assertTransitionAllowed");
    expect(builder).not.toContain("assertAllocationConservation");
    expect(builder).not.toContain("createMultiCheckAllocation");
    expect(builder).not.toContain("applyAllocation");
    expect(builder).not.toContain("getDb");
    expect(builder).not.toContain("insertMultiCheckAllocation");
  });

  it("materializer rebuilds from committed snapshots and claims events only", () => {
    const materializer = read(
      "server/operational-session/check/read/multiCheckAllocationProjectionMaterializer.ts"
    );
    expect(materializer).toContain("committedSnapshots");
    expect(materializer).toContain("buildMultiCheckAllocationProjection");
    expect(materializer).toContain(
      "buildMultiCheckAllocationProjectionEventClaimKey"
    );
    expect(materializer).toContain(
      "tryMaterializeMultiCheckAllocationProjections"
    );
    expect(materializer).toContain("COMPLETELY REPLACES");
    expect(materializer).toContain("never merge");
    expect(materializer).not.toContain("EventBus");
    expect(materializer).not.toContain("outbox");
    expect(materializer).not.toContain("inbox");
    expect(materializer).not.toContain("finalizeCheckOutcome");
    expect(materializer).not.toContain("insertMultiCheckAllocation");
    expect(materializer).not.toContain("applyAllocationOnCheck");
  });

  it("does not modify Integration or Write Model Aggregate", () => {
    const integration = read(
      "server/operational-session/check/checkMultiCheckAllocationIntegration.ts"
    );
    expect(integration).toContain("MULTI-CHECK-ALLOCATION-INTEGRATION-1");
    expect(integration).not.toContain(
      "materializeMultiCheckAllocationProjections"
    );
    expect(integration).not.toContain(
      "InMemoryMultiCheckAllocationProjectionStore"
    );

    const checkService = read(
      "server/operational-session/check/CheckService.ts"
    );
    expect(checkService).not.toContain(
      "materializeMultiCheckAllocationProjections"
    );
    expect(checkService).not.toContain("multiCheckAllocationProjection");
  });

  it("projection store is Read Model only — no financial mutation APIs", () => {
    const store = read(
      "server/operational-session/check/read/multiCheckAllocationProjectionStore.ts"
    );
    expect(store).toContain("MultiCheckAllocationProjectionStore");
    expect(store).toContain("MUST NEVER merge");
    expect(store).toContain("Replace the entire Allocation projection snapshot");
    expect(store).not.toContain("createMultiCheckAllocation");
    expect(store).not.toContain("finalizeCheckOutcome");
    expect(store).not.toContain("db.transaction");
  });

  it("Domain and Persistence programs remain untouched markers", () => {
    const domain = read(
      "shared/operational-session/check/multiCheckAllocation/multiCheckAllocationCommands.ts"
    );
    expect(domain).toContain("MULTI-CHECK-ALLOCATION-DOMAIN-1");
    expect(domain).not.toContain("MULTI-CHECK-ALLOCATION-PROJECTION-1");
    const persistence = read(
      "server/operational-session/check/multiCheckAllocationRepository.ts"
    );
    expect(persistence).toContain("MULTI-CHECK-ALLOCATION-PERSISTENCE-1");
    expect(persistence).not.toContain("MULTI-CHECK-ALLOCATION-PROJECTION-1");
  });
});
