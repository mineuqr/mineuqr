/**
 * POS-PERSISTENCE-WIRING-1 — production persistence wiring guards.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("POS persistence architecture guards", () => {
  it("does not add a migration for tables already applied at 0093", () => {
    const drizzleFiles = readdirSync(join(repoRoot, "drizzle")).filter((name) =>
      name.endsWith(".sql")
    );
    expect(drizzleFiles.some((name) => name.startsWith("0094"))).toBe(false);
    expect(existsSync(join(repoRoot, "drizzle/0091_pos_terminals.sql"))).toBe(true);
    expect(existsSync(join(repoRoot, "drizzle/0092_pos_permission_grants.sql"))).toBe(
      true
    );
    expect(existsSync(join(repoRoot, "drizzle/0093_pos_sale_idempotency.sql"))).toBe(
      true
    );
  });

  it("wires production composition to Drizzle and tests to InMemory", () => {
    const composition = read("server/pos/posComposition.ts");
    const selection = read("server/pos/infrastructure/posStoreSelection.ts");
    expect(composition).toContain("selectPosTerminalStore");
    expect(composition).toContain("selectPosPermissionGrantStore");
    expect(composition).toContain("selectPosSaleIdempotencyStore");
    expect(selection).toContain("DrizzlePosTerminalStore");
    expect(selection).toContain("DrizzlePosPermissionGrantStore");
    expect(selection).toContain("DrizzlePosSaleIdempotencyStore");
    expect(selection).toContain('nodeEnv === "test"');
    expect(selection).toContain("InMemoryPosTerminalStore");
    expect(composition).toContain("InMemoryPosCheckIntakeIdempotencyStore");
    expect(composition).toContain("InMemoryPosSettlementInitiateIdempotencyStore");
    expect(composition).not.toMatch(
      /const defaultStore = new InMemoryPosTerminalStore/
    );
    expect(selection).not.toContain("GenericRepository");
    expect(selection).not.toContain("BaseRepository");
  });

  it("keeps existing unique indexes as the uniqueness authority", () => {
    const schema = read("drizzle/schema.ts");
    expect(schema).toContain("pos_terminals_restaurant_code_unique");
    expect(schema).toContain("pos_permission_grants_unique");
    expect(schema).toContain("pos_sale_idempotency_unique");
    expect(schema).not.toMatch(/export const posOrders|export const posChecks|export const posSettlements/);
    expect(schema).not.toMatch(/export const posRegisters|export const posShifts|export const posCash/);

    const saleStore = read("server/pos/infrastructure/DrizzlePosSaleIdempotencyStore.ts");
    expect(saleStore).toContain("isMysqlDuplicateKeyError");
    expect(saleStore).toContain("PosSaleIdempotencyConflictError");
    expect(saleStore).toContain("posSaleIdempotency");
    expect(saleStore).not.toContain(".update(posSaleIdempotency)");
    expect(saleStore).not.toContain("operationalDevices");
  });

  it("does not create a second POS authority or generic persistence framework", () => {
    const files = [
      "server/pos/infrastructure/DrizzlePosTerminalStore.ts",
      "server/pos/infrastructure/DrizzlePosPermissionGrantStore.ts",
      "server/pos/infrastructure/DrizzlePosSaleIdempotencyStore.ts",
      "server/pos/infrastructure/posPersistenceErrors.ts",
      "server/pos/infrastructure/posStoreSelection.ts",
    ];
    for (const file of files) {
      const src = read(file);
      expect(src, file).not.toContain("GenericRepository");
      expect(src, file).not.toContain("createPosOrder");
      expect(src, file).not.toContain("createPosCheck");
      expect(src, file).not.toContain("operationalDevices");
      expect(src, file).not.toMatch(/from ["'].*operational-device/);
      expect(src, file).not.toMatch(/from ["'].*reporting-platform/);
    }
  });
});
