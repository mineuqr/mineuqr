/**
 * PAYMENT-CONFIRM-SERVICE-1 — process-boundary architecture guards.
 * Façade extraction only. Not a financial engine rewrite.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

const PAYMENT =
  "server/operational-session/payment/PaymentConfirmService.ts";
const CHECK = "server/operational-session/check/CheckService.ts";
const POS = "server/pos/services/PosSettlementInitiateService.ts";
const ROUTER = "server/pos/api/posRouter.ts";
const SESSION = "server/diningSession/sessionService.ts";
const SETTLE_ORDER = "server/order/application/SettleOrderPaidService.ts";
const COUNTER =
  "server/order/application/StaffCounterPickupSettlementService.ts";
const REFUND = "shared/operational-session/check/refund/refundBudget.ts";
const SCHEMA = "drizzle/schema.ts";
const JOURNAL = "drizzle/meta/_journal.json";

function sliceDefaultSettlePaid(pos: string): string {
  const start = pos.indexOf("async function defaultSettlePaid");
  const end = pos.indexOf("function unexplainedFinancialTxnGapMs");
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return pos.slice(start, end);
}

describe("PAYMENT-CONFIRM-SERVICE-1 architecture", () => {
  it("exists as the explicit Payment process boundary and delegates to certified settle", () => {
    const payment = read(PAYMENT);
    const index = read("server/operational-session/payment/index.ts");
    expect(existsSync(join(repoRoot, PAYMENT))).toBe(true);
    expect(index).toContain("confirmPayment");
    expect(payment).toContain("export async function confirmPayment");
    expect(payment).toContain("PAYMENT-CONFIRM-SERVICE-1");
    expect(payment).toContain("I-PAY-01");
    expect(payment).toContain("I-PAY-14");
    expect(payment).toContain("settleCheckPaidByIdDetailed");
    expect(payment).toMatch(
      /from ["']\.\.\/check\/CheckService["']/
    );
    expect(payment).toContain("await settleCheckPaidByIdDetailed({");
  });

  it("does not create a payments table, PaymentEngine, or second financial SSOT", () => {
    const payment = read(PAYMENT);
    const schema = read(SCHEMA);
    const journal = read(JOURNAL);
    expect(journal).toContain("0095_check_charges");
    expect(journal).not.toContain("0096_");
    const drizzleFiles = readdirSync(join(repoRoot, "drizzle"));
    expect(drizzleFiles.some((name) => name.startsWith("0096"))).toBe(false);
    expect(existsSync(join(repoRoot, "drizzle/0096_payments.sql"))).toBe(false);
    expect(schema).toContain("export const operationalChecks");
    expect(schema).toContain("export const checkSettlementTransactions");
    expect(schema).toContain("export const settlementRecords");
    expect(schema).not.toMatch(/mysqlTable\(\s*"payments"/);
    expect(schema).not.toMatch(
      /export const payments\b|export const paymentAggregates|export const paymentTransactions|export const paymentEngine/
    );
    expect(payment).not.toContain("PaymentEngine");
    expect(payment).not.toContain("PaymentAggregate");
    expect(payment).not.toContain("class PaymentConfirm");
    expect(payment).not.toContain("computeCheckMoney");
    expect(payment).not.toContain("billAmountDueFromCollection");
    expect(payment).not.toContain("remainingCollectible");
    expect(payment).not.toContain("loadChargesSubtotal");
    expect(payment).not.toContain("insertSettlementTransactions");
    expect(payment).not.toContain("createSettlementRecordForCheckFinalize");
  });

  it("does not replace Check, Settlement Record, Order lifecycle, or Refund", () => {
    const payment = read(PAYMENT);
    const check = read(CHECK);
    const refund = read(REFUND);
    expect(check).toContain("async function finalizeOpenCheckById");
    expect(check).toContain("export async function settleCheckPaidByIdDetailed");
    expect(check).toContain("createSettlementRecordForCheckFinalize");
    expect(check).toContain("insertSettlementTransactions");
    expect(check).toContain("applyFullSettlementToCheckOrders");
    expect(payment).not.toContain("insertOrder(");
    expect(payment).not.toContain("createOrder(");
    expect(payment).not.toContain("applyFullSettlementToCheckOrders");
    expect(payment).not.toContain("refundableBalance");
    expect(payment).not.toContain("createRefund");
    expect(payment).not.toContain("applyRefundOnCheck");
    expect(refund).toContain("Settlement Record history only");
  });

  it("preserves CheckService compatibility and the existing transaction boundary", () => {
    const payment = read(PAYMENT);
    const check = read(CHECK);
    const settlePaid = sliceDefaultSettlePaid(read(POS));
    expect(check).toContain("PAYMENT-CONFIRM-SERVICE-1 / I-PAY-14");
    expect(check).toContain("withCheckOwnedTransaction");
    expect(payment).not.toContain("withCheckOwnedTransaction");
    expect(payment).not.toContain("db.transaction");
    expect(payment).not.toContain("beginTransaction");
    expect(settlePaid).toContain("confirmPayment");
    expect(settlePaid).not.toContain("withCheckOwnedTransaction");
    expect(settlePaid).not.toContain("db.transaction");
  });

  it("migrates Confirm Payment callers onto confirmPayment; complimentary stays on CheckService", () => {
    const pos = read(POS);
    const router = read(ROUTER);
    const session = read(SESSION);
    const settleOrder = read(SETTLE_ORDER);
    const counter = read(COUNTER);
    expect(pos).toContain("confirmPayment");
    expect(pos).not.toContain("settleCheckPaidByIdDetailed");
    expect(router).toContain("getPosSettlementInitiateService()");
    expect(router).not.toContain("confirmPayment");
    expect(router).not.toContain("PaymentConfirmService");
    expect(session).toContain("confirmPayment");
    expect(session).not.toContain("settleCheckPaidByIdDetailed");
    expect(session).toContain("settleCheckComplimentaryByIdDetailed");
    expect(settleOrder).toContain("confirmPayment");
    expect(settleOrder).not.toContain("settleCheckPaidByIdDetailed");
    expect(counter).toContain("confirmPayment");
    expect(counter).not.toContain("settleCheckPaidByIdDetailed");
    expect(counter).toContain("voidCheckByIdDetailed");
  });
});
