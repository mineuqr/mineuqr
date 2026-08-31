/**
 * SETTLEMENT-RECORD-IMPLEMENTATION-1 — migration / schema architecture guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("settlement_records migration guards", () => {
  it("defines append-only settlement_records with business uniqueness", () => {
    const sql = read("drizzle/0076_settlement_records.sql");
    expect(sql).toContain("CREATE TABLE `settlement_records`");
    expect(sql).toContain("settlement_records_business_unique");
    expect(sql).toContain("`restaurantId`");
    expect(sql).toContain("`checkId`");
    expect(sql).toContain("`recordKind`");
    expect(sql).toContain("`recordGeneration`");
    expect(sql).toContain("`currencySnapshotJson`");
    expect(sql).toContain("`taxPolicySnapshotJson`");
    expect(sql).toContain("`paymentSnapshotJson`");
    expect(sql).toContain("`businessDay`");
    expect(sql).not.toContain("ON UPDATE CURRENT_TIMESTAMP");
    expect(sql).not.toContain("FOREIGN KEY");
  });

  it("journal retains 0076_settlement_records (terminus may advance)", () => {
    const schema = read("drizzle/schema.ts");
    expect(schema).toContain('"settlement_records"');
    expect(schema).toContain("settlement_records_business_unique");
    expect(schema).toContain("settlementRecords");

    const journal = read("drizzle/meta/_journal.json");
    expect(journal).toContain("0076_settlement_records");

    const gov = read("scripts/lib/migration-governance-lib.cjs");
    // Tail advances with later certified migrations; 0076 remains in journal.
    expect(gov).toContain("CANONICAL_MIGRATION_TAIL_TAG");
    expect(gov).toContain("CANONICAL_JOURNAL_ENTRY_COUNT");
  });
});
