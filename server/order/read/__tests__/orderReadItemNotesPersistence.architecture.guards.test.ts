import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ORDER_READ_PROJECTION_SCHEMA_VERSION } from "../domain/contracts/projectionIds";

const repoRoot = join(__dirname, "../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("ORDERING-READ-ITEM-NOTES-PERSISTENCE-1 architecture guards", () => {
  it("read store schema defines itemNotes column", () => {
    const schema = read("drizzle/schema.ts");
    expect(schema).toContain("orderReadOrderLineItems");
    expect(schema).toMatch(/itemNotes:\s*text\(\)/);
  });

  it("governed migration 0064 adds itemNotes", () => {
    const sql = read("drizzle/0064_order_read_item_notes.sql");
    const journal = read("drizzle/meta/_journal.json");
    expect(sql).toContain("itemNotes");
    expect(sql).toContain("order_read_order_line_items");
    expect(journal).toContain("0064_order_read_item_notes");
  });

  it("persist and read mappers round-trip itemNotes", () => {
    const mapper = read(
      "server/order/read/infrastructure/persistence/mapStoredOrderReadLineItem.ts"
    );
    const store = read(
      "server/order/read/infrastructure/persistence/drizzle/DrizzleOrderReadProjectionStore.ts"
    );
    expect(mapper).toContain("itemNotes: normalizeItemNotes(row.itemNotes)");
    expect(mapper).toContain("itemNotes: normalizeItemNotes(item.itemNotes)");
    expect(mapper).not.toMatch(/itemNotes:\s*null,\s*\n\s*category/);
    expect(store).toContain("itemNotes: persisted.itemNotes");
  });

  it("builders project write-model notes into itemNotes", () => {
    const category = read(
      "server/order/read/projections/builders/OrderCategoryProjectionBuilder.ts"
    );
    const lines = read(
      "server/order/read/projections/builders/OrderReadLineItemProjectionBuilder.ts"
    );
    expect(category).toContain("itemNotes: item.notes ?? null");
    expect(lines).toContain("itemNotes: item.notes ?? null");
  });

  it("bumps order read projection schema version for itemNotes persistence", () => {
    expect(ORDER_READ_PROJECTION_SCHEMA_VERSION).toBe(4);
  });
});
