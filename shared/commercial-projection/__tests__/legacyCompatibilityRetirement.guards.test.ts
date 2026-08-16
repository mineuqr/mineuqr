/**
 * LEGACY-COMPATIBILITY-RETIREMENT-1 — classification completeness + unused removal guards.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  LEGACY_COMPAT_FEATURE_KEYS,
  LEGACY_COMPATIBILITY_RETIREMENT_PROGRAM,
  LEGACY_COMPAT_KEY_RETIREMENT,
  LEGACY_COMPAT_STRUCTURE_RETIREMENT,
  assertLegacyCompatKeyClassificationComplete,
  listLegacyCompatKeysByAction,
  COMMERCIAL_PROJECTION_IDS,
} from "@shared/commercial-projection";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("LEGACY-COMPATIBILITY-RETIREMENT-1", () => {
  it("classifies every legacy compat feature key", () => {
    expect(LEGACY_COMPATIBILITY_RETIREMENT_PROGRAM).toBe(
      "LEGACY-COMPATIBILITY-RETIREMENT-1"
    );
    expect(() => assertLegacyCompatKeyClassificationComplete()).not.toThrow();
    for (const key of LEGACY_COMPAT_FEATURE_KEYS) {
      const row = LEGACY_COMPAT_KEY_RETIREMENT[key];
      expect(row.usageClass).toBeTruthy();
      expect(row.retirementAction).toBeTruthy();
      expect(row.consumers.length).toBeGreaterThan(0);
      expect(row.evidence.length).toBeGreaterThan(0);
      expect(row.retirementCondition.length).toBeGreaterThan(0);
    }
  });

  it("does not schedule RETIRE_IMMEDIATELY for any remaining legacy feature key", () => {
    expect(listLegacyCompatKeysByAction("RETIRE_IMMEDIATELY")).toEqual([]);
  });

  it("keeps blocked UI-gated keys out of immediate retirement", () => {
    for (const key of ["reports", "excelExport", "templates", "customColors", "customFonts"] as const) {
      expect(LEGACY_COMPAT_KEY_RETIREMENT[key].retirementAction).toBe("BLOCKED");
      expect(LEGACY_COMPAT_KEY_RETIREMENT[key].usageClass).toBe(
        "ACTIVE_DEPENDENCY"
      );
    }
  });

  it("removed unused LEGACY_DIRECT_PROJECTION_KEYS", () => {
    const compat = read("shared/commercial-projection/legacyCompat.ts");
    expect(compat).not.toContain("LEGACY_DIRECT_PROJECTION_KEYS");
    const direct = LEGACY_COMPAT_STRUCTURE_RETIREMENT.find(
      (r) => r.id === "LEGACY-DIRECT-PROJECTION-KEYS"
    );
    expect(direct?.retirementAction).toBe("RETIRE_IMMEDIATELY");
    expect(direct?.usageClass).toBe("UNUSED");
  });

  it("Projection SSOT unchanged (15 IDs); legacy remains Runtime-only", () => {
    expect(COMMERCIAL_PROJECTION_IDS).toHaveLength(19);
    expect(COMMERCIAL_PROJECTION_IDS).not.toContain("qrMenu");
    expect(COMMERCIAL_PROJECTION_IDS).not.toContain("reports");
    expect(LEGACY_COMPAT_FEATURE_KEYS).toContain("reports");
    expect(LEGACY_COMPAT_FEATURE_KEYS).toContain("templates");
  });

  it("structure inventory covers expand + matrix + UI gates", () => {
    const ids = new Set(LEGACY_COMPAT_STRUCTURE_RETIREMENT.map((r) => r.id));
    expect(ids.has("RUNTIME-EXPAND")).toBe(true);
    expect(ids.has("MATRIX-LEGACY-ROWS")).toBe(true);
    expect(ids.has("UI-GATES-LEGACY-KEYS")).toBe(true);
    expect(ids.has("LEGACY-PLAN-BRIDGE")).toBe(true);
  });
});
