import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ORDER_READ_PROJECTION_SCHEMA_VERSION } from "../domain/contracts/projectionIds";
import { normalizeOrderLineModifiers } from "@shared/ordering-platform/orderLineModifiers";

const repoRoot = join(__dirname, "../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("ORDER-READ-MODIFIERS-PERSISTENCE-1 architecture guards", () => {
  it("write and read schemas define modifiers json columns", () => {
    const schema = read("drizzle/schema.ts");
    expect(schema).toMatch(/orderItems[\s\S]*modifiers:\s*json\(\)/);
    expect(schema).toMatch(/orderReadOrderLineItems[\s\S]*modifiers:\s*json\(\)/);
  });

  it("governed migration 0068 adds modifiers", () => {
    const sql = read("drizzle/0068_order_read_modifiers.sql");
    const journal = read("drizzle/meta/_journal.json");
    expect(sql).toContain("order_items");
    expect(sql).toContain("order_read_order_line_items");
    expect(sql).toContain("modifiers");
    expect(journal).toContain("0068_order_read_modifiers");
  });

  it("Order Read DTOs and mappers expose modifiers", () => {
    const contracts = read("server/order/read/domain/contracts/queryContracts.ts");
    const mapper = read(
      "server/order/read/infrastructure/persistence/mapStoredOrderReadLineItem.ts"
    );
    const store = read(
      "server/order/read/infrastructure/persistence/drizzle/DrizzleOrderReadProjectionStore.ts"
    );
    expect(contracts).toContain("modifiers: readonly string[]");
    expect(mapper).toContain("normalizeOrderLineModifiers(row.modifiers)");
    expect(mapper).toContain("modifiers: [...normalizeOrderLineModifiers(item.modifiers)]");
    expect(store).toContain("modifiers: persisted.modifiers");
  });

  it("builders project write-model modifiers into read DTOs", () => {
    const category = read(
      "server/order/read/projections/builders/OrderCategoryProjectionBuilder.ts"
    );
    const lines = read(
      "server/order/read/projections/builders/OrderReadLineItemProjectionBuilder.ts"
    );
    expect(category).toContain("normalizeOrderLineModifiers(item.modifiers)");
    expect(lines).toContain("normalizeOrderLineModifiers(item.modifiers)");
  });

  it("waiter workspace forwards projected modifiers only", () => {
    const service = read(
      "server/operational-device/services/WaiterTableWorkspaceService.ts"
    );
    const stage = read("client/src/pages/waiter/WaiterTableWorkspaceStage.tsx");
    expect(service).toContain("modifiers: item.modifiers");
    expect(service).not.toMatch(/modifiers:\s*\[\s*\]/);
    expect(stage).not.toContain("Modifiers: —");
  });

  it("bumps order read projection schema version for modifiers", () => {
    expect(ORDER_READ_PROJECTION_SCHEMA_VERSION).toBe(6);
  });

  it("normalizes modifier labels without inventing values", () => {
    expect(normalizeOrderLineModifiers(["  A  ", "", "B"])).toEqual(["A", "B"]);
    expect(normalizeOrderLineModifiers(null)).toEqual([]);
    expect(normalizeOrderLineModifiers("x")).toEqual([]);
  });
});
