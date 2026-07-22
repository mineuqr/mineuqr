import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("CHECK-MANAGEMENT-ARCHITECTURE-1 architecture guards", () => {
  it("Check contracts own outcome vocabulary without cancelled", () => {
    const contract = read(
      "shared/operational-session/check/checkContract.ts"
    );
    expect(contract).toContain("CHECK_OUTCOMES");
    expect(contract).toContain('"open"');
    expect(contract).toContain('"paid"');
    expect(contract).toContain('"complimentary"');
    expect(contract).toContain('"voided"');
    expect(contract).not.toMatch(/CHECK_OUTCOMES[\s\S]*cancelled/);
    expect(contract).toContain("TAX_POLICY_SNAPSHOT_VERSION");
    expect(contract).toContain("OperationalCheck");
  });

  it("Check id is independent of Session id", () => {
    const arch = read(
      "docs/engineering/programs/CHECK-MANAGEMENT-ARCHITECTURE-1/ARCHITECTURE.md"
    );
    expect(arch).toContain("Check MUST have its own immutable identifier");
    expect(arch).toMatch(/Check id[^\n]*Session/i);
    expect(arch).toContain("Do NOT implement Split Check");
  });

  it("does not place settlement inside Order Domain", () => {
    const orderPolicy = read(
      "server/order/domain/policies/OrderLifecyclePolicy.ts"
    );
    expect(orderPolicy).not.toContain("Check");
    expect(orderPolicy).not.toContain("settlement");
    expect(orderPolicy).not.toContain("taxPolicy");
  });

  it("Session Platform owns Check service wiring", () => {
    const lifecycle = read(
      "server/operational-session/operationalSessionLifecycle.ts"
    );
    expect(lifecycle).toContain("void_check");
    expect(lifecycle).toContain("voidOperationalSessionCheck");
    const sessionService = read("server/diningSession/sessionService.ts");
    expect(sessionService).toContain("createOpenCheckForSession");
    expect(sessionService).toContain("settleCheckPaidById");
    expect(sessionService).toContain("voidCheckById");
  });

  it("persists operational_checks and business tax settings", () => {
    const schema = read("drizzle/schema.ts");
    expect(schema).toContain('mysqlTable("operational_checks"');
    expect(schema).toContain("activeCheckId");
    expect(schema).toContain("taxEnabled");
    expect(schema).toContain("taxMode");
    expect(schema).toContain("taxPolicyJson");
    const migration = read("drizzle/0069_check_management.sql");
    expect(migration).toContain("CHECK-MANAGEMENT-ARCHITECTURE-1");
    expect(migration).toContain("operational_checks");
  });

  it("freeze policy forbids live-settings rewrite of snapshots", () => {
    const freeze = read(
      "shared/operational-session/check/freezePolicy.ts"
    );
    expect(freeze).toContain("Snapshots NEVER change after create");
    expect(freeze).toContain("never live settings");
    expect(freeze).toContain("CHECK_FREEZE_POLICY_ID");
  });

  it("does not introduce accounting / ledger concepts in Check contracts", () => {
    const contract = read(
      "shared/operational-session/check/checkContract.ts"
    );
    expect(contract.toLowerCase()).not.toContain("ledger");
    expect(contract.toLowerCase()).not.toContain("journal");
    expect(contract.toLowerCase()).not.toContain("receivable");
  });
});
