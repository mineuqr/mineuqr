/**
 * DEAD-REVERSAL-CORRECTION-WRITER-AUDIT-AND-REMOVAL-1
 * Dedicated Settlement reversal/correction writers do not exist.
 * Domain kinds and historical readers remain.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("DEAD-REVERSAL-CORRECTION-WRITER-AUDIT-AND-REMOVAL-1", () => {
  it("does not export dedicated reversal/correction Settlement writers", () => {
    const cmds = read(
      "shared/operational-session/check/settlementRecord/settlementRecordCommands.ts"
    );
    const barrel = read(
      "shared/operational-session/check/settlementRecord/index.ts"
    );
    for (const src of [cmds, barrel]) {
      expect(src).not.toMatch(/\bexport function createReversal\b/);
      expect(src).not.toMatch(/\bexport function createCorrection\b/);
      expect(src).not.toMatch(/\bexport function applyReversal\b/);
      expect(src).not.toMatch(/\bexport function applyCorrection\b/);
    }
    expect(cmds).toContain("export function createCompensatingSettlementRecord");
    expect(cmds).toContain("there is no dedicated writer");
  });

  it("keeps live writers on refund / Check finalize, not reversal or correction", () => {
    const refund = read(
      "shared/operational-session/check/refund/refundCommands.ts"
    );
    const writer = read(
      "server/operational-session/check/checkSettlementRecordIntegration.ts"
    );
    const refundIntegration = read(
      "server/operational-session/check/checkRefundIntegration.ts"
    );
    expect(refund).toContain("createCompensatingSettlementRecord");
    expect(refund).toContain('recordKind: "refund"');
    expect(refund).not.toContain('recordKind: "reversal"');
    expect(refund).not.toContain('recordKind: "correction"');
    expect(writer).toContain("recordKindForCheckOutcome");
    expect(writer).not.toContain('recordKind: "reversal"');
    expect(writer).not.toContain('recordKind: "correction"');
    expect(refundIntegration).toContain('recordKind: "refund"');
    expect(refundIntegration).not.toContain('recordKind: "reversal"');
    expect(refundIntegration).not.toContain('recordKind: "correction"');
  });

  it("does not reach reversal/correction writers from recovery or Settlement write API", () => {
    const recover = read(
      "server/operational-session/payment/recoverCashierPosDownstreamSettlement.ts"
    );
    const router = read(
      "server/operational-session/check/api/settlementRecordReadRouter.ts"
    );
    expect(recover).not.toContain("createCompensatingSettlementRecord");
    expect(recover).not.toContain('recordKind: "reversal"');
    expect(recover).not.toContain('recordKind: "correction"');
    expect(router).toContain("read-only tRPC exposure");
    expect(router).not.toContain(".mutation(");
  });

  it("preserves reversal/correction as readable domain kinds", () => {
    const contract = read(
      "shared/operational-session/check/settlementRecord/settlementRecordContract.ts"
    );
    const mapper = read(
      "server/operational-session/check/api/settlementRecordApiMapper.ts"
    );
    expect(contract).toContain('"reversal"');
    expect(contract).toContain('"correction"');
    expect(contract).toContain("recordGeneration");
    expect(mapper).toContain('record.recordKind === "reversal"');
    expect(mapper).toContain('record.recordKind === "correction"');
  });
});
