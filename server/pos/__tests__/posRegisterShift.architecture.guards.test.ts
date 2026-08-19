/**
 * POS-REGISTER-SHIFT-IMPLEMENTATION-1 — POS consumes CRMP; does not own it.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { POS_PERMISSIONS } from "@shared/pos";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

const POS_REGISTER_SHIFT_OWNED = [
  "server/pos/services/PosRegisterShiftContextService.ts",
];

describe("POS Register/Shift wiring architecture guards", () => {
  it("reuses CRMP SettlementContextResolver and does not create a POS Register domain", () => {
    const wiring = read("server/pos/services/PosRegisterShiftContextService.ts");
    const schema = read("drizzle/schema.ts");
    const journal = read("drizzle/meta/_journal.json");
    expect(wiring).toContain("resolveSettlementContextForSettle");
    expect(wiring).toContain("requireCanonicalRegisterShift");
    expect(wiring).not.toContain("createRegister");
    expect(wiring).not.toContain("openFinancialShift");
    expect(wiring).not.toContain("openRegister");
    expect(wiring).not.toContain("closeRegister");
    expect(wiring).not.toContain("StaffCounterPickupSettlementService");
    expect(wiring).not.toMatch(/class PosRegister |class PosShift |PosCashbox/);
    expect(schema).toContain("export const crmpRegisters");
    expect(schema).toContain("export const crmpFinancialShifts");
    expect(schema).not.toMatch(
      /export const posRegisters|export const posShifts|export const posCashboxes|export const posCashDrawers/
    );
    expect(journal).toContain("0093_pos_sale_idempotency");
    expect(journal).toContain("0094_commercial_limit_occupancy_locks");
    expect(journal).not.toContain("0094_pos_");
  });

  it("keeps POS Terminal distinct from Operational Device and CRMP Register", () => {
    const terminal = read("shared/pos/terminal.ts");
    const access = read("shared/pos/access.ts");
    expect(terminal).toContain("optionalDeviceId");
    expect(access).not.toContain("registerId");
    expect(access).not.toContain("financialShiftId");
    expect(access).not.toContain("shiftId");
    for (const file of POS_REGISTER_SHIFT_OWNED) {
      const src = read(file);
      expect(src, file).not.toContain("operationalDevices");
      expect(src, file).not.toMatch(/from ["'].*reporting-platform/);
      expect(src, file).not.toContain("settleCheckPaidByIdDetailed");
    }
  });

  it("does not weaken CRMP or POS authorization", () => {
    const wiring = read("server/pos/services/PosRegisterShiftContextService.ts");
    const crmpRouter = read("server/crmp/api/crmpRouter.ts");
    const posRouter = read("server/pos/api/posRouter.ts");
    expect(POS_PERMISSIONS).toContain("SHIFT_OPEN");
    expect(POS_PERMISSIONS).toContain("SHIFT_CLOSE");
    expect(POS_PERMISSIONS).toContain("REGISTER_ADJUST");
    expect(POS_PERMISSIONS).toContain("POS_ACCESS");
    expect(wiring).not.toMatch(/if \(isOwner\) return true/);
    expect(wiring).not.toMatch(/role === ["']admin["']/);
    expect(crmpRouter).toContain("assertRestaurantAccess");
    expect(posRouter).toContain("getPosRegisterShiftContextService()");
    expect(posRouter).toContain("registerShift:");
    expect(posRouter).not.toContain("createRegister");
    expect(posRouter).not.toContain("openFinancialShift");
    expect(posRouter).not.toContain("RegisterDomainService");
    expect(posRouter).not.toContain("FinancialShiftDomainService");
  });

  it("leaves Check as financial authority and Settlement as settlement authority", () => {
    const settle = read("server/pos/services/PosSettlementInitiateService.ts");
    expect(settle).toContain("confirmPayment");
    expect(
      read("server/operational-session/payment/PaymentConfirmService.ts")
    ).toContain("settleCheckPaidByIdDetailed");
    expect(settle).toContain("settlementContextHints");
    expect(settle).toContain("requireResolvedContextForSettlement");
    expect(settle).not.toContain("StaffCounterPickupSettlementService");
    expect(settle).not.toMatch(/from ["'].*reporting-platform/);
    expect(settle).not.toContain("createRegister");
    expect(settle).not.toContain("openFinancialShift");
  });
});
