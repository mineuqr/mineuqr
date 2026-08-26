/**
 * ADR-ARCH-038 / PAYMENT-CASHIER-DIRECT-FINANCIAL-COMMIT-IMPLEMENTATION-1
 * Cashier Confirm MUST NOT require a pre-existing Check. Financial commit
 * remains synchronous via confirmPayment. Other channels keep ensureCheckForOrder.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

const PANEL = "client/src/components/cashier-workspace/CashierWorkspacePanel.tsx";
const READY = "client/src/lib/cashier-workspace/cashierPaymentReadiness.ts";
const SETTLE = "server/pos/services/PosSettlementInitiateService.ts";
const PAYMENT = "server/operational-session/payment/PaymentConfirmService.ts";
const CHECK = "server/operational-session/check/CheckService.ts";
const CONSUMER =
  "server/order/infrastructure/events/consumers/OrderSessionConsumer.ts";
const INTAKE = "server/pos/services/PosCheckIntakeService.ts";
const SCHEMA = "drizzle/schema.ts";
const JOURNAL = "drizzle/meta/_journal.json";

describe("ADR-ARCH-038 cashier direct financial commit", () => {
  it("does not gate Cashier Confirm on open Check.grandTotal or intake", () => {
    const panel = read(PANEL);
    const ready = read(READY);
    expect(ready).toContain("previewGrandTotal");
    expect(ready).toContain("saleReady");
    expect(ready).not.toContain("checkOutcome");
    expect(ready).not.toContain("checkGrandTotal");
    expect(ready).not.toContain("computeCheckMoney");
    expect(panel).not.toContain("function orchestrateIntake");
    expect(panel).not.toContain("trpc.pos.check.intake");
    expect(panel).not.toContain("amountDueIsOrderFallback");
    expect(panel).toContain("billDiscountAmount: directSale.money.billDiscountAmount");
    expect(panel).toContain("setPrintOpen(true)");
    expect(panel).toContain("cancelPaymentSheet");
    expect(panel).not.toContain("trpc.order.cancel");
    expect(panel).not.toContain("voidCheck");
  });

  it("routes cashier Confirm through confirmPayment(orderId) without pre-pay ensureCheck", () => {
    const settle = read(SETTLE);
    const payment = read(PAYMENT);
    const check = read(CHECK);
    expect(settle).toContain("confirmPayment");
    expect(settle).toContain("finalizeCashierPreparedInvoice");
    expect(settle).not.toContain("ensureCheckForOrder");
    expect(settle).not.toContain("settleCheckPaidByIdDetailed");
    expect(settle).toContain("orderId: order.id");
    expect(settle).toContain("billDiscountAmount");
    expect(settle).toContain("awaitAttribution: false");
    expect(settle).toContain("requireResolvedContextForSettlement");
    expect(payment).toContain("settleCashierPosOrderPaidByIdDetailed");
    expect(payment).toContain("await settleCheckPaidByIdDetailed({");
    expect(check).toContain("export async function settleCashierPosOrderPaidByIdDetailed");
    expect(check).toContain("freezeCashierPosPayableFromOrder");
    expect(check).toContain("materializeOrLoadCashierPosOpenCheck");
    expect(check).toContain("deliverCashierPosOperationalSettlementAfterPaid");
    expect(check).toContain("computeCheckMoney");
    expect(check).toContain("createSettlementRecordForCheckFinalize");
    expect(check).toContain("applyFullSettlementToCheckOrders");
  });

  it("skips cashier_pos auto-enroll and keeps ensureCheckForOrder for other sessionless channels", () => {
    const consumer = read(CONSUMER);
    const intake = read(INTAKE);
    expect(consumer).toContain("isCashierPosOrderingChannel");
    expect(consumer).toContain("ensureCheckForOrder");
    expect(intake).toContain("ensureCheckForOrder");
  });

  it("does not add a payments table or PaymentEngine; Confirm remains Check-centered (ADR-038)", () => {
    const journal = read(JOURNAL);
    expect(journal).toContain("0095_check_charges");
    expect(journal).toContain("0096_payment_collection_facts");
    expect(journal).not.toContain("0096_payments");
    const drizzleFiles = readdirSync(join(repoRoot, "drizzle"));
    expect(drizzleFiles).toContain("0096_payment_collection_facts.sql");
    expect(drizzleFiles.some((name) => name.startsWith("0096_payments"))).toBe(false);
    expect(existsSync(join(repoRoot, "drizzle/0096_payments.sql"))).toBe(false);
    expect(read(SCHEMA)).not.toMatch(/mysqlTable\(\s*"payments"/);
    expect(read(PAYMENT)).not.toContain("PaymentEngine");
    expect(read(SETTLE)).not.toContain("offlineFinancial");
  });
});
