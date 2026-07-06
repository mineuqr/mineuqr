import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../");

function read(rel: string) {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("ORDER-READ-CATEGORY-PROJECTION-1 architecture guards", () => {
  it("single category projection builder authority", () => {
    const builder = read("server/order/read/projections/builders/OrderCategoryProjectionBuilder.ts");
    expect(builder).toContain("class OrderCategoryProjectionBuilder");
    expect(builder).toContain("CategoryProjectionValidationError");
  });

  it("line items expose canonical category projection — not optional categoryId", () => {
    const contracts = read("server/order/read/domain/contracts/queryContracts.ts");
    expect(contracts).toContain("category: OrderCategoryProjection");
    expect(contracts).not.toMatch(/categoryId\?:/);
  });

  it("runtime kitchen read model does not derive categories", () => {
    const readModel = read("client/src/lib/operational-screen/kitchen/kitchenRuntimeReadModel.ts");
    expect(readModel).toContain("category.categoryId");
    expect(readModel).not.toContain("missingCategoryData");
    expect(readModel).not.toContain("queueHasCategoryData");
    expect(readModel).not.toContain("extractLineItemCategoryId");
  });

  it("runtime category filter has no missing-category fallback", () => {
    const apply = read("client/src/lib/operational-screen/kitchen/applyKitchenCategoryFilter.ts");
    const manager = read("client/src/lib/operational-screen/category-filter/runtimeCategoryFilterManager.ts");
    expect(apply).not.toContain("missingCategoryData");
    expect(manager).not.toContain("missingCategoryData");
  });

  it("category resolution occurs in projection builder only", () => {
    const kitchenComposer = read("server/kitchen/read/services/KitchenTicketComposer.ts");
    expect(kitchenComposer).not.toContain("CategoryResolution");
    expect(kitchenComposer).not.toContain("getCategory");
    const adapter = read("server/kitchen/read/infrastructure/OrderReadQueryAdapter.ts");
    expect(adapter).toContain("parseStoredCategoryProjection");
  });
});
