/**
 * PAYMENT-READINESS-CHECK-ENSURE-STAGE-INSTRUMENTATION-1
 * Observability-only architecture guards. No optimization, no financial move.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

function sliceExport(src: string, startName: string, endName: string): string {
  const start = src.indexOf(startName);
  const end = src.indexOf(endName);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return src.slice(start, end);
}

describe("PAYMENT-READINESS-CHECK-ENSURE-STAGE-INSTRUMENTATION-1 architecture", () => {
  it("uses existing Date.now / opsLog clocks and does not add DB work for timing", () => {
    const stages = read(
      "server/operational-session/check/ensureCheckForOrderStageMs.ts"
    );
    const taxonomy = read("server/_core/opsTaxonomy.ts");
    expect(stages).toContain("Date.now()");
    expect(stages).not.toContain("performance.now()");
    expect(stages).not.toContain("getDb");
    expect(stages).not.toContain("getOrderById");
    expect(stages).not.toContain("console.log");
    expect(stages).not.toContain("console.info");
    expect(taxonomy).toContain("check_ensure_for_order");
  });

  it("keeps createOpenCheck outside the existing financial transaction", () => {
    const service = read("server/operational-session/check/CheckService.ts");
    const body = sliceExport(
      service,
      "export async function ensureCheckForOrder",
      "export async function settleCheckPaidById"
    );
    expect(body).toContain("createOpenCheck");
    expect(body).toContain("withCheckOwnedTransaction");
    expect(body.indexOf("createOpenCheck")).toBeLessThan(
      body.lastIndexOf("withCheckOwnedTransaction")
    );
    expect(body).not.toContain("createSettlementRecord");
    expect(body).not.toContain("confirmPayment(");
    expect(body).not.toContain("db.transaction");
  });

  it("does not batch Charge inserts or collapse duplicate Charge reads", () => {
    const composition = read(
      "server/operational-session/check/checkChargeComposition.ts"
    );
    const service = read("server/operational-session/check/CheckService.ts");
    const refresh = sliceExport(
      service,
      "async function refreshOpenCheckMoneyFromDiscovery",
      "async function enrollRefreshAndReloadCheck"
    );
    expect(composition).toContain("for (const correction of plan)");
    expect(composition).toContain("await insertCheckCharge(");
    expect(composition).not.toMatch(/insertCheckCharges|batchInsertCheckCharge/);
    expect(refresh).toContain("ensureOpenCheckChargeComposition");
    expect(refresh).toContain("loadChargesSubtotal");
    expect(refresh).toContain("computeCheckMoney");
    expect(refresh).toContain("updateCheckMoney");
  });

  it("keeps Order Settlement inside the Check-owned transaction and SR off this path", () => {
    const service = read("server/operational-session/check/CheckService.ts");
    const helper = sliceExport(
      service,
      "async function enrollRefreshAndReloadCheck",
      "function applyOwnedTransactionStages"
    );
    expect(helper).toContain("ensureOrderSettlementForEnrollment");
    expect(helper).toContain("recalculateOrderSettlementsForCheck");
    expect(helper).not.toContain("createSettlementRecordForCheckFinalize");
    expect(helper).toContain("enrollOrderInCheck");
  });
});
