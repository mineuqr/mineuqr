/**
 * POS-CHECK-INTAKE-IMPLEMENTATION-1 — ownership and boundary guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { POS_PERMISSIONS } from "@shared/pos";
import { ORDERING_CHANNEL_CASHIER_POS } from "@shared/ordering-platform/orderingChannelRegistry";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

const INTAKE_OWNED = [
  "server/pos/services/PosCheckIntakeService.ts",
  "server/pos/infrastructure/PosCheckIntakeIdempotencyStore.ts",
  "server/pos/infrastructure/InMemoryPosCheckIntakeIdempotencyStore.ts",
];

describe("POS Check Intake architecture guards", () => {
  it("uses existing ensureCheckForOrder and does not create a POS Check table", () => {
    const intake = read("server/pos/services/PosCheckIntakeService.ts");
    const schema = read("drizzle/schema.ts");
    expect(POS_PERMISSIONS).toContain("CHECK_INTAKE");
    expect(intake).toContain("ensureCheckForOrder");
    expect(intake).toContain('requiredPermission: "CHECK_INTAKE"');
    expect(intake).toContain("resolvePosTerminalAccess");
    expect(intake).toContain("ORDERING_CHANNEL_CASHIER_POS");
    expect(intake).not.toMatch(/class PosCheck |POSCheckAggregate|createPosCheck/);
    expect(intake).not.toContain("settleCheckPaid");
    expect(intake).not.toContain("settlePaid");
    expect(intake).not.toContain("markPaid");
    expect(intake).not.toContain("createRegister");
    expect(intake).not.toContain("openFinancialShift");
    expect(intake).not.toMatch(/from ["'].*reporting-platform/);
    expect(schema).not.toMatch(/export const posChecks|export const pos_checks/);
    expect(schema).toContain("export const operationalChecks");
  });

  it("keeps the POS router thin and outside the Check Domain", () => {
    const router = read("server/pos/api/posRouter.ts");
    expect(router).toContain("getPosCheckIntakeService()");
    expect(router).toContain("check:");
    expect(router).toContain("verifiedProcedure");
    expect(router).not.toContain("CheckService");
    expect(router).not.toContain("ensureCheckForOrder");
    expect(router).not.toMatch(/\bsettlePaid\b|\bcreatePayment\b|\brefundCreate\b/);
    expect(router).not.toContain("openFinancialShift");
  });

  it("does not rewrite Order channel or invent a POS Session", () => {
    const intake = read("server/pos/services/PosCheckIntakeService.ts");
    expect(ORDERING_CHANNEL_CASHIER_POS).toBe("cashier_pos");
    expect(intake).not.toMatch(/UPDATE.*orderingChannel/i);
    expect(intake).not.toContain("insertSession(");
    expect(intake).not.toContain("createPosSession");
    expect(intake).toContain("sessionId: null");
  });

  it("does not settle, mutate Register, or write Reporting", () => {
    for (const file of INTAKE_OWNED) {
      const src = read(file);
      expect(src, file).not.toContain("settleCheckPaidById");
      expect(src, file).not.toContain("createRegister");
      expect(src, file).not.toContain("openFinancialShift");
      expect(src, file).not.toMatch(/from ["'].*reporting-platform/);
      expect(src, file).not.toContain("operationalDevices");
      expect(src, file).not.toContain("posRevenue");
    }
  });

  it("derives cashier and restaurant from the authenticated access context", () => {
    const intake = read("server/pos/services/PosCheckIntakeService.ts");
    expect(intake).toContain("userId: input.user.id");
    expect(intake).toContain("cashierUserId: context.userId");
    expect(intake).not.toContain("posCashierId");
    expect(intake).not.toMatch(/cashierId:\s*input\.command/);
    expect(intake).not.toMatch(/grandTotal:\s*input/);
  });
});
