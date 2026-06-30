import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const storePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../infrastructure/DrizzlePrintWorkspaceReadStore.ts"
);

describe("DrizzlePrintWorkspaceReadStore", () => {
  it("queries only order_read_* projection tables", () => {
    const source = readFileSync(storePath, "utf8");
    expect(source).toContain("orderReadOrders");
    expect(source).toContain("orderReadOrderLineItems");
    expect(source).toContain("orderReadOrderTimeline");
    expect(source).not.toMatch(/\borders\b.*from.*getOrders/);
    expect(source).not.toContain("getOrderById");
    expect(source).not.toContain("getOrdersWithItems");
  });
});
