import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CANONICAL_TAIL_TAGS,
  LEGACY_ORPHAN_SQL_TAGS,
  findGovernanceViolations,
  hashMigrationSql,
  loadJournal,
  validateJournalOrdering,
} from "../lib/migration-governance-lib.cjs";

const repoRoot = join(__dirname, "../..");

describe("MIGRATION-GOVERNANCE-RESTORATION-1 regression guards", () => {
  it("journal contains canonical migrations 0000–0057 contiguously", () => {
    const journal = loadJournal();
    expect(journal.entries).toHaveLength(58);
    expect(journal.entries[0]?.tag).toBe("0000_shiny_blizzard");
    expect(journal.entries[57]?.tag).toBe("0057_operational_device_screen_config_revision");
    expect(validateJournalOrdering()).toEqual([]);
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
    expect(guard).toContain("0057_operational_device_screen_config_revision");
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
});
