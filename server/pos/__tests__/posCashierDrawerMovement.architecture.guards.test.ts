/**
 * POS-CASHIER-DRAWER-MOVEMENT-1 — POS adapts CRMP; does not own cash.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { POS_PERMISSIONS } from "@shared/pos";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("POS cashier drawer movement architecture guards", () => {
  it("is a thin adapter over CRMP recordDrawerMovement and does not persist cash", () => {
    const service = read("server/pos/services/PosCashierCrmpOperationsService.ts");
    const router = read("server/pos/api/posRouter.ts");
    const schema = read("drizzle/schema.ts");
    const journal = read("drizzle/meta/_journal.json");
    expect(POS_PERMISSIONS).toContain("POS_ACCESS");
    expect(POS_PERMISSIONS).toContain("REGISTER_ADJUST");
    expect(service).toContain("this.shifts.recordDrawerMovement");
    expect(service).toContain('requiredPermission: "REGISTER_ADJUST"');
    expect(service).toContain('action: "pos.cashier.financialShift.recordDrawerMovement"');
    expect(service).toContain('context.permissions.includes("POS_ACCESS")');
    expect(service).toContain("actorUserId: context.userId");
    expect(service).toContain("idempotencyKey: input.command.idempotencyKey");
    expect(service).not.toContain("persistDrawerMovement");
    expect(service).not.toContain("FinancialShiftDomainService");
    expect(service).not.toContain("computeExpectedCash");
    expect(service).not.toContain("drawerMovementIdForRetry");
    expect(service).not.toContain("pos_cash_movements");
    expect(service).not.toContain("pos_drawer_movements");
    expect(service).not.toContain("settleCheckPaid");
    expect(service).not.toContain("IdentityPlaceOrder");
    expect(service).not.toMatch(/from ["'].*reporting-platform/);
    expect(router).toContain("recordDrawerMovement");
    expect(router).not.toContain("FinancialShiftDomainService");
    expect(router).not.toContain("RegisterDomainService");
    expect(schema).toContain("export const crmpDrawerMovements");
    expect(schema).not.toMatch(
      /export const posCashMovements|export const posDrawerMovements|export const posCashLedger|export const posCashiers/
    );
    expect(journal).toContain("0093_pos_sale_idempotency");
    expect(journal).toContain("0094_commercial_limit_occupancy_locks");
    expect(journal).not.toContain("0094_pos_");
  });

  it("does not trust client cashier, restaurant, register, or shift identity as authority", () => {
    const service = read("server/pos/services/PosCashierCrmpOperationsService.ts");
    const router = read("server/pos/api/posRouter.ts");
    const movement = service.slice(service.indexOf("async recordDrawerMovement"));
    const movementInput = router.slice(
      router.indexOf("const cashierDrawerMovementInput"),
      router.indexOf("const SALE_FORBIDDEN_CODES")
    );
    expect(movement).toContain("restaurantId: context.restaurantId");
    expect(movement).toContain("actorUserId: context.userId");
    expect(movement).not.toMatch(/actorUserId:\s*input\.command/);
    expect(movement).not.toMatch(/operatorUserId:\s*input\.command/);
    expect(movement).not.toMatch(/cashierId:\s*input\.command/);
    expect(movement).not.toContain("expectedVersion");
    expect(movement).not.toContain("computeExpectedCash");
    expect(movementInput).not.toContain("cashierId");
    expect(movementInput).not.toContain("operatorUserId");
    expect(movementInput).not.toContain("actorUserId");
    expect(movementInput).not.toContain("movementId");
    expect(service).not.toMatch(/if \(isOwner\) return true/);
    expect(service).not.toMatch(/role === ["']admin["']/);
  });

  it("does not become financial authority or reuse Device Management as POS Terminal", () => {
    const service = read("server/pos/services/PosCashierCrmpOperationsService.ts");
    const router = read("server/pos/api/posRouter.ts");
    expect(service).not.toContain("operationalDevices");
    expect(service).not.toContain("grandTotal");
    expect(service).not.toContain("settleOrderPaid");
    expect(service).not.toContain("createPayment");
    expect(router).not.toContain("pos_cash_movements");
    expect(router).not.toMatch(/from ["'].*reporting-platform/);
    expect(router).not.toContain("CheckService");
  });
});
