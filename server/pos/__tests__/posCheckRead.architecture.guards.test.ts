/**
 * CASHIER-POS-CHECK-READ-CONTRACT-1 — POS Check read boundary guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("CASHIER-POS-CHECK-READ-CONTRACT-1 POS Check read architecture", () => {
  it("reads Check through membership + getCheckById under POS authorization", () => {
    const service = read("server/pos/services/PosCheckReadService.ts");
    const dto = read("server/pos/read/posCheckDto.ts");
    const router = read("server/pos/api/posReadRouter.ts");
    expect(service).toContain("requirePosReadContext");
    expect(service).toContain("findBlockingMembershipForOrder");
    expect(service).toContain("getCheckById");
    expect(service).toContain("pos.read.check.getByOrder");
    expect(service).not.toContain("ensureCheckForOrder");
    expect(service).not.toContain("settleCheckPaid");
    expect(service).not.toContain("OrderSettlement");
    expect(service).not.toContain("outstandingAmount");
    expect(service).not.toContain("computeCheckMoney");
    expect(service).not.toContain("totalAmount");
    expect(dto).toContain("grandTotal");
    expect(dto).toContain("billDiscountAmount");
    expect(dto).not.toContain("toFixed");
    expect(dto).not.toContain("computeCheckMoney");
    expect(dto).not.toContain("outstandingAmount");
    expect(router).toContain("getPosCheckReadService().getByOrder");
    expect(router).toContain("getPosCheckReadService");
    expect(router).not.toContain("ensureCheckForOrder");
    expect(router).not.toContain("CheckService");
  });

  it("does not expand Order Settlement or invent a second financial aggregate", () => {
    const service = read("server/pos/services/PosCheckReadService.ts");
    const schema = read("drizzle/schema.ts");
    expect(service).not.toContain("materialize");
    expect(service).not.toContain("orderSettlementProjection");
    expect(schema).not.toMatch(/export const posOrderCheck|export const cashierCheckDue/);
  });
});
