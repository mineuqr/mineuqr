/**
 * POS-CASHIER-CRMP-OPERATIONS-1 — POS consumes CRMP; does not own cashier/cash.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { POS_PERMISSIONS } from "@shared/pos";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("POS cashier CRMP operations architecture guards", () => {
  it("calls existing CRMP façades and does not create POS cashier/cash persistence", () => {
    const service = read("server/pos/services/PosCashierCrmpOperationsService.ts");
    const schema = read("drizzle/schema.ts");
    const journal = read("drizzle/meta/_journal.json");
    expect(POS_PERMISSIONS).toContain("SHIFT_OPEN");
    expect(POS_PERMISSIONS).toContain("SHIFT_CLOSE");
    expect(POS_PERMISSIONS).toContain("REGISTER_ADJUST");
    expect(service).toContain("getCrmpRegisterOperationsService");
    expect(service).toContain("getCrmpFinancialShiftOperationsService");
    expect(service).toContain('requiredPermission: "SHIFT_OPEN"');
    expect(service).toContain('requiredPermission: "SHIFT_CLOSE"');
    expect(service).toContain('requiredPermission: "REGISTER_ADJUST"');
    expect(service).toContain("operatorUserId: context.userId");
    expect(service).toContain("actorUserId: context.userId");
    expect(service).toContain("this.shifts.recordDrawerMovement");
    expect(service).not.toContain("persistDrawerMovement");
    expect(service).not.toContain("pos_cashiers");
    expect(service).not.toContain("StaffCounterPickupSettlementService");
    expect(service).not.toMatch(/from ["'].*reporting-platform/);
    expect(schema).not.toMatch(
      /export const posCashiers|export const posCashMovements|export const posCashDrawers|export const posRegisters|export const posShifts/
    );
    expect(schema).toContain("export const crmpRegisters");
    expect(schema).toContain("export const crmpDrawerMovements");
    expect(journal).toContain("0093_pos_sale_idempotency");
    expect(journal).toContain("0094_commercial_limit_occupancy_locks");
    expect(journal).not.toContain("0094_pos_");
  });

  it("does not treat owner/admin as cashier and does not trust client cashier identity", () => {
    const service = read("server/pos/services/PosCashierCrmpOperationsService.ts");
    expect(service).toContain('context.permissions.includes("POS_ACCESS")');
    expect(service).not.toMatch(/cashierId:\s*input\.command/);
    expect(service).not.toMatch(/operatorUserId:\s*input\.command/);
    expect(service).not.toMatch(/actorUserId:\s*input\.command/);
    expect(service).not.toMatch(/if \(isOwner\) return true/);
    expect(service).not.toMatch(/role === ["']admin["']/);
  });

  it("keeps the POS router as a thin adapter over CRMP façades", () => {
    const router = read("server/pos/api/posRouter.ts");
    const crmpRouter = read("server/crmp/api/crmpRouter.ts");
    expect(router).toContain("getPosCashierCrmpOperationsService()");
    expect(router).toContain("cashier:");
    expect(router).toContain("recordDrawerMovement");
    expect(router).not.toContain("RegisterDomainService");
    expect(router).not.toContain("FinancialShiftDomainService");
    expect(crmpRouter).toContain("assertRestaurantAccess");
    expect(crmpRouter).toContain("crmp.register.open");
  });

  it("does not introduce a second RBAC, Device, or Reporting write path", () => {
    const service = read("server/pos/services/PosCashierCrmpOperationsService.ts");
    expect(service).not.toContain("operationalDevices");
    expect(service).not.toContain("jsonwebtoken");
    expect(service).not.toContain("pos_session");
    expect(service).not.toMatch(/from ["'].*reporting-platform/);
    expect(service).not.toContain("offlineFinancial");
  });
});
