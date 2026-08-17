/**
 * POS-SALE-ORDER-IMPLEMENTATION-1 — ownership and boundary guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ORDERING_CHANNEL_CASHIER_POS,
  ORDERING_CHANNEL_KIOSK,
  ORDERING_CHANNEL_QR,
  ORDERING_CHANNEL_TABLE_SESSION,
  ORDERING_CHANNEL_WAITER_TABLET,
} from "@shared/ordering-platform/orderingChannelRegistry";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

const SALE_OWNED = [
  "server/pos/services/PosSaleService.ts",
  "server/pos/infrastructure/PosSaleIdempotencyStore.ts",
  "server/pos/infrastructure/InMemoryPosSaleIdempotencyStore.ts",
  "server/pos/infrastructure/DrizzlePosSaleIdempotencyStore.ts",
];

describe("POS Sale architecture guards", () => {
  it("uses IdentityPlaceOrder and does not create a POS Order aggregate", () => {
    const sale = read("server/pos/services/PosSaleService.ts");
    const schema = read("drizzle/schema.ts");
    const sql = read("drizzle/0093_pos_sale_idempotency.sql");
    expect(sale).toContain("IdentityPlaceOrder");
    expect(sale).toContain('requiredPermission: "SALE_CREATE"');
    expect(sale).toContain("resolvePosTerminalAccess");
    expect(sale).toContain("ORDERING_CHANNEL_CASHIER_POS");
    expect(sale).toContain('identityScope: "POS"');
    expect(sale).not.toMatch(/class PosOrder|POSOrder|PosOrderAggregate/);
    expect(sale).not.toContain("settlePaid");
    expect(sale).not.toContain("settleCheckPaid");
    expect(sale).not.toContain("markPaid");
    expect(sale).not.toContain("createRegister");
    expect(sale).not.toContain("openFinancialShift");
    expect(sale).not.toContain("SalesChannelAnalytics");
    expect(sale).not.toMatch(/from ["'].*reporting-platform/);
    expect(schema).toContain("export const posSaleIdempotency");
    expect(schema).toContain('"pos_sale_idempotency"');
    expect(schema).not.toMatch(/export const posOrders|export const posSales|export const posOrderLines/);
    expect(sql).toContain("CREATE TABLE `pos_sale_idempotency`");
    expect(sql).not.toMatch(/CREATE TABLE `pos_sales`|CREATE TABLE `pos_orders`|CREATE TABLE `pos_order_lines`/);
    expect(sql).not.toMatch(/ALTER TABLE `orders`/);
    expect(sql).not.toMatch(/CREATE TABLE `operational_checks`/);
  });

  it("keeps the POS router thin and outside the Order Domain", () => {
    const router = read("server/pos/api/posRouter.ts");
    expect(router).toContain("getPosSaleService()");
    expect(router).toContain("sale:");
    expect(router).toContain("verifiedProcedure");
    expect(router).not.toMatch(/IdentityPlaceOrderService|placeOrderComposition/);
    expect(router).not.toMatch(/from ["'].*IdentityPlaceOrder/);
    expect(router).not.toMatch(/\bsettlePaid\b|\bdirectSale\b|\bplaceOrder\b|\bcreatePayment\b|\brefundCreate\b/);
    expect(router).not.toContain("CheckService");
    expect(router).not.toContain("openFinancialShift");
  });

  it("does not rewrite existing Table/QR/Waiter/Kiosk channel identity", () => {
    const sale = read("server/pos/services/PosSaleService.ts");
    const settle = read("server/order/application/SettleOrderPaidService.ts");
    expect(ORDERING_CHANNEL_CASHIER_POS).toBe("cashier_pos");
    expect(ORDERING_CHANNEL_QR).toBe("qr");
    expect(ORDERING_CHANNEL_TABLE_SESSION).toBe("table_session");
    expect(ORDERING_CHANNEL_WAITER_TABLET).toBe("waiter_tablet");
    expect(ORDERING_CHANNEL_KIOSK).toBe("kiosk");
    expect(sale).not.toMatch(/orderingChannel:\s*["']qr["']/);
    expect(sale).not.toMatch(/UPDATE.*orderingChannel/i);
    expect(settle).not.toContain("cashier_pos");
    expect(settle).not.toContain("orderingChannel");
  });

  it("does not create POS Session, Check, Settlement, Register, or Revenue", () => {
    for (const file of SALE_OWNED) {
      const src = read(file);
      expect(src, file).not.toContain("insertSession(");
      expect(src, file).not.toContain("createPosSession");
      expect(src, file).not.toContain("createPosCheck");
      expect(src, file).not.toContain("POS_PENDING");
      expect(src, file).not.toContain("POS_COMPLETED");
      expect(src, file).not.toMatch(/from ["'].*reporting-platform/);
      expect(src, file).not.toContain("operationalDevices");
    }
  });

  it("derives cashier and restaurant from the authenticated access context", () => {
    const sale = read("server/pos/services/PosSaleService.ts");
    expect(sale).toContain("userId: input.user.id");
    expect(sale).toContain("cashierUserId: context.userId");
    expect(sale).not.toContain("posCashierId");
    expect(sale).not.toMatch(/cashierId:\s*input\.command/);
    expect(sale).not.toMatch(/channel:\s*input\.command/);
    expect(sale).not.toMatch(/grandTotal:\s*input/);
  });

  it("joins POS sale mapping to the Order save transaction and does not fall back to legacy", () => {
    const sale = read("server/pos/services/PosSaleService.ts");
    const repo = read("server/order/infrastructure/persistence/DrizzleOrderRepository.ts");
    const drizzle = read("server/pos/infrastructure/DrizzlePosSaleIdempotencyStore.ts");
    expect(sale).toContain("afterPersistInTransaction");
    expect(sale).toContain("putInTransaction");
    expect(sale).toContain("PosSaleIdempotencyUniqueCollisionError");
    expect(sale).toContain("awaitRelay: false");
    expect(sale).toContain("enrollCheck: false");
    expect(sale).not.toContain("createPosOrder");
    expect(repo).toContain("afterPersistInTransaction");
    expect(repo).toContain("requireSameTransactionCompanion");
    expect(repo).toContain('throw new Error("database_unavailable")');
    expect(drizzle).toContain("putInTransaction");
    expect(drizzle).toContain("PosSaleIdempotencyUniqueCollisionError");
  });
});
