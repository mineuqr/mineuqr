/**
 * CRMP-DRAWER-MOVEMENT-API-1 — architecture compliance guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("CRMP drawer movement architecture guards", () => {
  it("keeps drawer movements CRMP-owned on existing persistence", () => {
    const router = read("server/crmp/api/crmpRouter.ts");
    const svc = read("server/crmp/api/crmpFinancialShiftOperationsService.ts");
    const schema = read("drizzle/schema.ts");
    const journal = read("drizzle/meta/_journal.json");
    const movementProcedure = router.slice(
      router.indexOf("recordDrawerMovement: verifiedProcedure")
    );
    const movementInput = router.slice(
      router.indexOf("const recordDrawerMovementInput"),
      router.indexOf("export const crmpRouter")
    );
    expect(router).toContain("crmp.financialShift.recordDrawerMovement");
    expect(router).toContain("assertRestaurantAccess");
    expect(movementProcedure).toContain("actorUserId: ctx.user.id");
    expect(movementProcedure).not.toMatch(/actorUserId:\s*input\./);
    expect(movementInput).not.toContain("actorUserId");
    expect(movementInput).not.toContain("operatorUserId");
    expect(svc).toContain("drawerMovementIdForRetry");
    expect(svc).not.toMatch(/from ["'].*reporting-platform/);
    expect(schema).toContain("export const crmpDrawerMovements");
    expect(schema).not.toMatch(
      /export const posCashMovements|export const posDrawerMovements|export const posCashLedger/
    );
    expect(journal).toContain("0093_pos_sale_idempotency");
    expect(journal).toContain("0094_commercial_limit_occupancy_locks");
    expect(journal).not.toContain("0094_pos_");
  });

  it("lets POS adapt drawer movement without owning persistence or domain writes", () => {
    const posRouter = read("server/pos/api/posRouter.ts");
    const posCashier = read(
      "server/pos/services/PosCashierCrmpOperationsService.ts"
    );
    expect(posCashier).toContain("this.shifts.recordDrawerMovement");
    expect(posCashier).toContain('requiredPermission: "REGISTER_ADJUST"');
    expect(posCashier).not.toContain("persistDrawerMovement");
    expect(posCashier).not.toContain("FinancialShiftDomainService");
    expect(posCashier).not.toContain("pos_cash_movements");
    expect(posCashier).not.toContain("computeExpectedCash");
    expect(posRouter).toContain("recordDrawerMovement");
    expect(posRouter).not.toContain("FinancialShiftDomainService");
    expect(posRouter).not.toContain("RegisterDomainService");
  });

  it("does not expose update/delete of historical movements or opening_float", () => {
    const router = read("server/crmp/api/crmpRouter.ts");
    expect(router).not.toMatch(/drawerMovement\.(update|delete|remove)/);
    expect(router).toContain('z.enum(DRAWER_MOVEMENT_API_TYPES)');
    const dtos = read("server/crmp/api/crmpApiDtos.ts");
    expect(dtos).not.toContain("opening_float");
    expect(dtos).toContain("paid_in");
  });

  it("does not move Check, Settlement, or Revenue ownership", () => {
    const svc = read("server/crmp/api/crmpFinancialShiftOperationsService.ts");
    const commands = read("shared/crmp/financialShift/financialShiftCommands.ts");
    expect(svc).not.toContain("settleCheckPaid");
    expect(svc).not.toContain("grandTotal");
    expect(commands).not.toMatch(/from ["']@shared\/operational-session/);
    expect(commands).toContain("idempotency key reused with conflicting payload");
  });
});
