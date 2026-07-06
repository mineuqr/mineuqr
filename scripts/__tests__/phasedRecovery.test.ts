import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  OPERATIONAL_MIGRATION_ORDER,
  PACKAGE_CHECKSUM,
  RECOVERY_PHASES,
  assertApprovedMigrationTag,
  getPhaseById,
  hashMigrationSql,
  resolvePhaseRunList,
} from "../lib/phased-recovery-contract.cjs";
import {
  SMOKE_CHECKLIST,
  loadMigrationSqlStatements,
} from "../lib/phased-recovery-engine.cjs";
import { CANONICAL_TAIL_TAGS } from "../lib/migration-governance-lib.cjs";

const repoRoot = join(__dirname, "../..");

describe("MIGRATION-EXECUTION-ALIGNMENT-1 phased recovery", () => {
  it("uses certified operational order 0054→0055→0057→0056 (not journal idx)", () => {
    expect(OPERATIONAL_MIGRATION_ORDER).toEqual([
      "0054_operational_devices",
      "0055_operational_device_screen_config",
      "0057_operational_device_screen_config_revision",
      "0056_order_read_category_projection",
    ]);
    const journalOrder = [...CANONICAL_TAIL_TAGS];
    expect(journalOrder).not.toEqual(OPERATIONAL_MIGRATION_ORDER);
  });

  it("defines six recovery phases with migration tags in operational order", () => {
    const migrationPhases = RECOVERY_PHASES.filter((p) => p.kind === "migration");
    expect(migrationPhases.map((p) => p.migrationTag)).toEqual(OPERATIONAL_MIGRATION_ORDER);
    expect(RECOVERY_PHASES.map((p) => p.id)).toEqual([
      "phase-1",
      "phase-2",
      "phase-3",
      "phase-4",
      "phase-5",
      "phase-6",
    ]);
  });

  it("phase-3 applies 0057 before phase-4 applies 0056", () => {
    expect(getPhaseById("phase-3").migrationTag).toBe("0057_operational_device_screen_config_revision");
    expect(getPhaseById("phase-4").migrationTag).toBe("0056_order_read_category_projection");
  });

  it("phase-4 has backfill gate; phase-5 is backfill verify", () => {
    expect(getPhaseById("phase-4").backfillGate).toBe(true);
    expect(getPhaseById("phase-5").kind).toBe("backfill-verify");
    expect(getPhaseById("phase-6").kind).toBe("smoke");
  });

  it("supports resume-from phase-3, phase-4, verify, and smoke", () => {
    expect(resolvePhaseRunList({ resumeFrom: "phase-3" }).map((p) => p.id)).toEqual([
      "phase-3",
      "phase-4",
      "phase-5",
      "phase-6",
    ]);
    expect(resolvePhaseRunList({ resumeFrom: "phase-4" }).map((p) => p.id)).toEqual([
      "phase-4",
      "phase-5",
      "phase-6",
    ]);
    expect(resolvePhaseRunList({ resumeFrom: "phase-5" }).map((p) => p.id)).toEqual(["phase-5", "phase-6"]);
    expect(resolvePhaseRunList({ phase: "phase-2" }).map((p) => p.id)).toEqual(["phase-2"]);
  });

  it("loads only approved migration SQL (no bulk migrate surface)", () => {
    for (const tag of OPERATIONAL_MIGRATION_ORDER) {
      const stmts = loadMigrationSqlStatements(tag);
      expect(stmts.length).toBeGreaterThan(0);
    }
    expect(() => assertApprovedMigrationTag("0053_foo")).toThrow(/unapproved/i);
  });

  it("preserves recovery package checksum from governance restoration", () => {
    const manifest = CANONICAL_TAIL_TAGS.map((tag) => `${tag}|${hashMigrationSql(tag)}`).join("\n");
    const { createHash } = require("node:crypto");
    const checksum = createHash("sha256").update(manifest).digest("hex");
    expect(checksum).toBe(PACKAGE_CHECKSUM);
  });

  it("blocks bulk drizzle-kit migrate in recovery execute entry", () => {
    const execute = readFileSync(
      join(repoRoot, "scripts/recovery/migration-0054-0057-execute.mjs"),
      "utf8"
    );
    expect(execute).not.toMatch(/spawnSync\([^)]*drizzle-kit/);
    expect(execute).toContain("migration-0054-0057-phased-execute.mjs");
  });

  it("phased executor requires backup confirmation gate", () => {
    const phased = readFileSync(
      join(repoRoot, "scripts/recovery/migration-0054-0057-phased-execute.mjs"),
      "utf8"
    );
    expect(phased).toContain("--confirm-backup");
    expect(phased).toContain("TIDB_BACKUP_CONFIRMED");
    expect(phased).not.toMatch(/spawnSync\([^)]*drizzle-kit/);
  });

  it("smoke checklist covers operational recovery surfaces", () => {
    expect(SMOKE_CHECKLIST.length).toBeGreaterThanOrEqual(5);
    expect(SMOKE_CHECKLIST.some((s) => /HTTP 500|Fleet/i.test(s))).toBe(true);
  });
});
