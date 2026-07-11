import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CANONICAL_TAIL_TAGS,
  CANONICAL_MIGRATION_TAIL_TAG,
  CANONICAL_JOURNAL_ENTRY_COUNT,
  LEGACY_ORPHAN_SQL_TAGS,
  findGovernanceViolations,
  hashMigrationSql,
  loadJournal,
  validateJournalOrdering,
} from "../lib/migration-governance-lib.cjs";

const repoRoot = join(__dirname, "../..");

describe("MIGRATION-GOVERNANCE-RESTORATION-1 regression guards", () => {
  it("journal contains canonical migrations 0000–0062 contiguously", () => {
    const journal = loadJournal();
    expect(journal.entries).toHaveLength(CANONICAL_JOURNAL_ENTRY_COUNT);
    expect(journal.entries[0]?.tag).toBe("0000_shiny_blizzard");
    expect(journal.entries[59]?.tag).toBe("0059_order_read_offer_projection");
    expect(journal.entries[60]?.tag).toBe("0060_device_activation_code");
    expect(journal.entries[61]?.tag).toBe("0061_order_business_identity");
    expect(journal.entries[62]?.tag).toBe(CANONICAL_MIGRATION_TAIL_TAG);
    expect(validateJournalOrdering()).toEqual([]);
  });

  it("exports certified migration tail constant", () => {
    expect(CANONICAL_MIGRATION_TAIL_TAG).toBe("0062_order_lifecycle_stage");
    expect(CANONICAL_JOURNAL_ENTRY_COUNT).toBe(63);
    const tags = loadJournal().entries.map((e) => e.tag);
    expect(tags[tags.length - 1]).toBe(CANONICAL_MIGRATION_TAIL_TAG);
  });

  it("registers restored tail migrations 0054–0057", () => {
    const tags = loadJournal().entries.map((e) => e.tag);
    for (const tag of CANONICAL_TAIL_TAGS) {
      expect(tags).toContain(tag);
    }
  });

  it("has no non-legacy orphan SQL files", () => {
    const v = findGovernanceViolations();
    expect(v.nonLegacyOrphans).toEqual([]);
  });

  it("documents legacy orphan SQL separately from canonical lineage", () => {
    const v = findGovernanceViolations();
    expect(v.legacyOrphans.sort()).toEqual([...LEGACY_ORPHAN_SQL_TAGS].sort());
  });

  it("journal tags have matching SQL files with stable hashes", () => {
    for (const entry of loadJournal().entries) {
      expect(() => hashMigrationSql(entry.tag)).not.toThrow();
    }
  });

  it("governance guard script enforces deploy gate", () => {
    const guard = readFileSync(join(repoRoot, "scripts/migration-governance-guard.cjs"), "utf8");
    expect(guard).toContain("CANONICAL_MIGRATION_TAIL_TAG");
    expect(guard).toContain("CANONICAL_JOURNAL_ENTRY_COUNT");
    expect(guard).toContain("process.exit(1)");
  });

  it("verify-schema covers operational device governance objects", () => {
    const verify = readFileSync(join(repoRoot, "scripts/verify-schema-deployment.cjs"), "utf8");
    expect(verify).toContain("operational_devices");
    expect(verify).toContain("screenConfigRevision");
    expect(verify).toContain("categoryProjection");
  });

  it("vercel build runs governance guard before compile", () => {
    const vercel = readFileSync(join(repoRoot, "vercel.json"), "utf8");
    expect(vercel).toContain("migration-governance-guard");
  });

  it("recovery execute delegates to phased orchestrator (no bulk migrate)", () => {
    const execute = readFileSync(
      join(repoRoot, "scripts/recovery/migration-0054-0057-execute.mjs"),
      "utf8"
    );
    expect(execute).not.toMatch(/spawnSync\([^)]*drizzle-kit/);
    expect(execute).toContain("phased-execute");
  });
});
