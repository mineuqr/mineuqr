import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../");

function read(rel: string) {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("ORDER-READ-BACKFILL-1 architecture guards", () => {
  it("category backfill service exists with batch defaults", () => {
    const service = read(
      "server/order/read/infrastructure/backfill/OrderReadCategoryBackfillService.ts"
    );
    expect(service).toContain("class OrderReadCategoryBackfillService");
    expect(service).toContain("CATEGORY_BACKFILL_DEFAULT_BATCH_SIZE = 500");
  });

  it("does not modify runtime or kitchen client modules", () => {
    const stream = read("client/src/lib/operational-screen/kitchen/useKitchenRuntimeStream.ts");
    const filter = read("client/src/lib/operational-screen/kitchen/applyKitchenCategoryFilter.ts");
    expect(stream).not.toContain("Backfill");
    expect(filter).not.toContain("Backfill");
  });

  it("uses canonical projection builder for migration", () => {
    const service = read(
      "server/order/read/infrastructure/backfill/OrderReadCategoryBackfillService.ts"
    );
    expect(service).toContain("buildCategoryProjectionsForMenuItems");
    expect(service).toContain("assertCanonicalCategoryProjection");
  });

  it("supports idempotent skip of upgraded rows", () => {
    const service = read(
      "server/order/read/infrastructure/backfill/OrderReadCategoryBackfillService.ts"
    );
    expect(service).toContain("isUpgradedCategoryProjection");
  });

  it("verifier checks legacy row count", () => {
    const verifier = read(
      "server/order/read/infrastructure/backfill/OrderReadCategoryBackfillVerifier.ts"
    );
    expect(verifier).toContain("legacyRows === 0");
  });
});
