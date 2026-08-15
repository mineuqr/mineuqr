/**
 * COMMERCIAL-OD-2-0088-MIGRATION-SAFETY-FIX-1
 * Migration safety only. Does not apply 0088.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  FAILURE,
  KNOWN_INTEGER_TO_CODE,
  classify0088Statement,
  simulate0088Execution,
  splitMigrationStatements,
  validate0088Conversion,
} from "../lib/live-plan-identity-0088-validation.cjs";

const repoRoot = join(__dirname, "../..");
const sql = readFileSync(
  join(repoRoot, "drizzle/0088_user_subscriptions_live_plan_identity.sql"),
  "utf8"
);
const bridge = readFileSync(
  join(repoRoot, "server/services/commercial-catalog/legacyPlanBridge.ts"),
  "utf8"
);

const LIVE = [
  { id: "uuid-basic", code: "basic" },
  { id: "uuid-pro", code: "professional" },
  { id: "uuid-ent", code: "enterprise" },
];

function sub(id: number, planId: number, planIdUuid?: string | null) {
  return { id, planId, ...(planIdUuid !== undefined ? { planIdUuid } : {}) };
}

describe("0088 mapping stays aligned with LEGACY_PLAN_BRIDGE", () => {
  it("SQL CASE and JS map use the same integer → code triples", () => {
    expect(sql).toContain("WHEN 30001 THEN 'basic'");
    expect(sql).toContain("WHEN 30002 THEN 'professional'");
    expect(sql).toContain("WHEN 30003 THEN 'enterprise'");
    expect(sql).not.toMatch(/79cf7bf7|0ade795a|d836bd10/);
    expect(KNOWN_INTEGER_TO_CODE[30001]).toBe("basic");
    expect(KNOWN_INTEGER_TO_CODE[30002]).toBe("professional");
    expect(KNOWN_INTEGER_TO_CODE[30003]).toBe("enterprise");
    expect(bridge).toContain("legacyPlanId: 30001");
    expect(bridge).toContain('catalogPlanCode: "basic"');
    expect(bridge).toContain("legacyPlanId: 30002");
    expect(bridge).toContain('catalogPlanCode: "professional"');
    expect(bridge).toContain("legacyPlanId: 30003");
    expect(bridge).toContain('catalogPlanCode: "enterprise"');
  });
});

describe("0088 SQL sequence: populate → validate → destructive", () => {
  it("places the validation gate before DROP COLUMN planId", () => {
    const kinds = splitMigrationStatements(sql).map(classify0088Statement);
    const gate = kinds.indexOf("validation_gate");
    const drop = kinds.indexOf("destructive_drop_integer");
    const promote = kinds.indexOf("destructive_promote");
    expect(kinds).toContain("add_uuid_column");
    expect(kinds).toContain("populate");
    expect(gate).toBeGreaterThan(-1);
    expect(drop).toBeGreaterThan(gate);
    expect(promote).toBeGreaterThan(drop);
    expect(sql).not.toMatch(/Fail closed: NOT NULL rejects/);
  });
});

describe("0088 conversion validation", () => {
  it("1. 30001 → basic → UUID", () => {
    const r = validate0088Conversion({
      subscriptions: [sub(1, 30001)],
      livePlans: LIVE,
    });
    expect(r.ok).toBe(true);
    expect(r.projected[0].expectedUuid).toBe("uuid-basic");
    expect(r.projected[0].code).toBe("basic");
  });

  it("2. 30002 → professional → UUID", () => {
    const r = validate0088Conversion({
      subscriptions: [sub(1, 30002)],
      livePlans: LIVE,
    });
    expect(r.ok).toBe(true);
    expect(r.projected[0].expectedUuid).toBe("uuid-pro");
  });

  it("3. 30003 → enterprise → UUID", () => {
    const r = validate0088Conversion({
      subscriptions: [sub(1, 30003)],
      livePlans: LIVE,
    });
    expect(r.ok).toBe(true);
    expect(r.projected[0].expectedUuid).toBe("uuid-ent");
  });

  it("4. unknown integer → FAIL CLOSED", () => {
    const r = validate0088Conversion({
      subscriptions: [sub(1, 99999)],
      livePlans: LIVE,
    });
    expect(r.ok).toBe(false);
    expect(r.failureCodes).toContain(FAILURE.UNKNOWN_INTEGER);
  });

  it("5. missing Live Plan → FAIL CLOSED", () => {
    const r = validate0088Conversion({
      subscriptions: [sub(1, 30002)],
      livePlans: LIVE.filter((p) => p.code !== "professional"),
    });
    expect(r.ok).toBe(false);
    expect(r.failureCodes).toContain(FAILURE.MISSING_LIVE_PLAN);
  });

  it("6. ambiguous Live Plan mapping → FAIL CLOSED", () => {
    const r = validate0088Conversion({
      subscriptions: [sub(1, 30002)],
      livePlans: [...LIVE, { id: "uuid-pro-2", code: "professional" }],
    });
    expect(r.ok).toBe(false);
    expect(r.failureCodes).toContain(FAILURE.AMBIGUOUS_LIVE_PLAN);
  });

  it("7. NULL target → FAIL CLOSED", () => {
    const r = validate0088Conversion({
      subscriptions: [sub(1, 30002, null)],
      livePlans: LIVE,
      populated: true,
    });
    expect(r.ok).toBe(false);
    expect(r.failureCodes).toContain(FAILURE.NULL_TARGET);
  });

  it("8. source/target count mismatch → FAIL CLOSED", () => {
    const r = validate0088Conversion({
      subscriptions: [sub(1, 30002, "uuid-pro"), sub(2, 999, null)],
      livePlans: LIVE,
      populated: true,
    });
    expect(r.ok).toBe(false);
    expect(r.failureCodes).toContain(FAILURE.COUNT_MISMATCH);
  });

  it("9. successful complete mapping → PASS", () => {
    const r = validate0088Conversion({
      subscriptions: [sub(1, 30001), sub(2, 30002), sub(3, 30003)],
      livePlans: LIVE,
      bindings: [{ subscriptionId: 1, planId: "uuid-basic" }],
    });
    expect(r.ok).toBe(true);
    expect(r.sourceCount).toBe(3);
    expect(r.convertedCount).toBe(3);
  });

  it("10. destructive phase is not reached after validation failure", () => {
    const failed = validate0088Conversion({
      subscriptions: [sub(1, 102)],
      livePlans: LIVE,
    });
    expect(failed.ok).toBe(false);
    const sim = simulate0088Execution(sql, failed);
    expect(sim.aborted).toBe(true);
    expect(sim.executed.some((s) => s.kind.startsWith("destructive"))).toBe(
      false
    );
    expect(sim.blocked.map((s) => s.kind)).toEqual([
      "destructive_drop_integer",
      "destructive_promote",
    ]);
  });

  it("orphan populated UUID → FAIL CLOSED", () => {
    const r = validate0088Conversion({
      subscriptions: [sub(1, 30002, "missing-uuid")],
      livePlans: LIVE,
      populated: true,
    });
    expect(r.ok).toBe(false);
    expect(r.failureCodes).toContain(FAILURE.ORPHAN_UUID);
  });
});
