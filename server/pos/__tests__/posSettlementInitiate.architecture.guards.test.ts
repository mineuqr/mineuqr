/**
 * POS-SETTLEMENT-INITIATE-IMPLEMENTATION-1 — ownership and boundary guards.
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

const SETTLEMENT_OWNED = [
  "server/pos/services/PosSettlementInitiateService.ts",
  "server/pos/infrastructure/PosSettlementInitiateIdempotencyStore.ts",
  "server/pos/infrastructure/InMemoryPosSettlementInitiateIdempotencyStore.ts",
];

describe("POS Settlement Initiation architecture guards", () => {
  it("routes Confirm Payment through confirmPayment and does not create a POS settlement aggregate", () => {
    const service = read("server/pos/services/PosSettlementInitiateService.ts");
    const payment = read(
      "server/operational-session/payment/PaymentConfirmService.ts"
    );
    const schema = read("drizzle/schema.ts");
    expect(POS_PERMISSIONS).toContain("SETTLEMENT_INITIATE");
    expect(POS_PERMISSIONS).toContain("POS_ACCESS");
    expect(service).toContain("confirmPayment");
    expect(service).not.toContain("settleCheckPaidByIdDetailed");
    expect(payment).toContain("settleCheckPaidByIdDetailed");
    expect(service).toContain('requiredPermission: "SETTLEMENT_INITIATE"');
    expect(service).toContain("resolvePosTerminalAccess");
    expect(service).toContain("ORDERING_CHANNEL_CASHIER_POS");
    expect(service).toContain("findBlockingMembershipForOrder");
    expect(service).toContain("getCheckById");
    expect(service).not.toMatch(/class PosSettlement |PosPayment|PosTender|PosRevenue/);
    expect(service).not.toContain("createRegister");
    expect(service).not.toContain("openFinancialShift");
    expect(service).not.toContain("StaffCounterPickupSettlementService");
    expect(service).not.toMatch(/from ["'].*reporting-platform/);
    expect(service).not.toMatch(/\bzatca\b/i);
    expect(schema).not.toMatch(
      /export const posSettlements|export const posPayments|export const posTenders|export const posRevenue|export const posChecks/
    );
    expect(schema).toContain("export const operationalChecks");
  });

  it("requires POS_ACCESS and explicit SETTLEMENT_INITIATE, not owner/admin/PLATFORM_OWNER", () => {
    const service = read("server/pos/services/PosSettlementInitiateService.ts");
    expect(service).toContain('context.permissions.includes("POS_ACCESS")');
    expect(service).toContain(
      'context.permissions.includes("SETTLEMENT_INITIATE")'
    );
    expect(service).not.toMatch(/role === ["']admin["'][\s\S]{0,80}SETTLEMENT_INITIATE/);
    expect(service).not.toMatch(/isPlatformOwner[\s\S]{0,80}return \{/);
    expect(service).not.toMatch(/if \(isOwner\) return true/);
  });

  it("keeps the POS router thin and outside public order.settlePaid", () => {
    const router = read("server/pos/api/posRouter.ts");
    const routers = read("server/routers.ts");
    expect(router).toContain("getPosSettlementInitiateService()");
    expect(router).toContain("settlement:");
    expect(router).toContain("initiate:");
    expect(router).toContain("verifiedProcedure");
    expect(router).not.toContain("CheckService");
    expect(router).not.toContain("settleCheckPaidByIdDetailed");
    expect(router).not.toMatch(/\bsettlePaid\b|\bcreatePayment\b|\brefundCreate\b/);
    expect(router).not.toContain("openFinancialShift");
    expect(routers).toContain("settlePaid: publicProcedure");
    expect(routers).not.toMatch(/pos[\s\S]{0,200}settlePaid/);
  });

  it("does not rewrite Order channel or own Register/Shift", () => {
    const service = read("server/pos/services/PosSettlementInitiateService.ts");
    expect(ORDERING_CHANNEL_CASHIER_POS).toBe("cashier_pos");
    expect(service).not.toMatch(/UPDATE.*orderingChannel/i);
    expect(service).not.toContain("insertSession(");
    expect(service).not.toContain("createPosSession");
    expect(service).not.toContain("createRegister");
    expect(service).not.toContain("openFinancialShift");
    expect(service).toContain("settlementContextHints");
    expect(service).toContain("requireResolvedContextForSettlement");
  });

  it("does not accept client financial totals; payment method is a catalog key forwarded to Check", () => {
    const service = read("server/pos/services/PosSettlementInitiateService.ts");
    const router = read("server/pos/api/posRouter.ts");
    expect(service).not.toMatch(/grandTotal:\s*input\.command/);
    expect(service).not.toMatch(/totalAmount:\s*input/);
    expect(service).not.toMatch(/cashierId:\s*input\.command/);
    expect(router).not.toContain("totalAmount");
    expect(router).not.toContain("tender");
    expect(router).toContain("SELECTABLE_PAYMENT_METHODS");
    expect(router).toContain('z.enum(["cash", "card"])');
    expect(router).toContain("paymentMethod");
    expect(router).not.toMatch(/from ["']@shared\/operational-session/);
    expect(service).toContain("confirmPayment");
    expect(service).toContain("settlements");
    for (const file of SETTLEMENT_OWNED) {
      const src = read(file);
      expect(src, file).not.toContain("createPayment");
      expect(src, file).not.toContain("pos_payments");
      expect(src, file).not.toContain("pos_tenders");
      expect(src, file).not.toMatch(/from ["'].*reporting-platform/);
      expect(src, file).not.toContain("offlineFinancial");
    }
  });

  it("does not introduce a POS settlement SQL table", () => {
    const schema = read("drizzle/schema.ts");
    const journal = read("drizzle/meta/_journal.json");
    expect(schema).not.toMatch(/export const posSettlementIdempotency/);
    expect(schema).toContain("export const posSaleIdempotency");
    expect(journal).toContain("0093_pos_sale_idempotency");
    expect(journal).toContain("0094_commercial_limit_occupancy_locks");
    expect(journal).not.toContain("0094_pos_");
  });
});
