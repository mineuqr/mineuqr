/**
 * PAYMENT-CONFIRM-REMAINING-CALLERS-1 — caller-convergence architecture guards.
 * Routes remaining Confirm Payment callers through confirmPayment.
 * Not a financial engine rewrite. Not a CheckService reduction.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

function walkTs(relDir: string): string[] {
  const abs = join(repoRoot, relDir);
  const out: string[] = [];
  const entries = readdirSync(abs, { withFileTypes: true });
  for (const entry of entries) {
    const child = join(relDir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "__tests__") continue;
      out.push(...walkTs(child));
      continue;
    }
    if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
      out.push(child.replaceAll("\\", "/"));
    }
  }
  return out;
}

const PAYMENT =
  "server/operational-session/payment/PaymentConfirmService.ts";
const CHECK = "server/operational-session/check/CheckService.ts";
const POS = "server/pos/services/PosSettlementInitiateService.ts";
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

describe("PAYMENT-CONFIRM-REMAINING-CALLERS-1 architecture", () => {
  it("does not let Session markPaid, QR settlePaid, or Counter Pickup create financial truth", () => {
    const session = read(SESSION);
    const settleOrder = read(SETTLE_ORDER);
    const counter = read(COUNTER);
    const pos = read(POS);
    expect(session).toContain("export async function markPaid");
    expect(session).toContain("Financial settlement requires Cashier Confirm");
    const paidFnStart = session.indexOf("export async function markPaid");
    const paidFn = session.slice(paidFnStart, paidFnStart + 500);
    expect(paidFn).not.toContain("await confirmPayment");
    expect(settleOrder).toContain("FINANCIAL_REQUIRES_CASHIER");
    expect(settleOrder).toContain("Financial settlement requires Cashier Confirm");
    expect(counter).toContain("FINANCIAL_REQUIRES_CASHIER");
    expect(sliceDefaultSettlePaid(pos)).toContain("await confirmPayment({");
    expect(pos).not.toContain("await settleCheckPaidByIdDetailed");
  });

  it("keeps confirmPayment as the single Payment process that delegates to certified settle", () => {
    const payment = read(PAYMENT);
    expect(payment).toContain("export async function confirmPayment");
    expect(payment).toContain("await settleCashierPosOrderPaidByIdDetailed({");
    expect(payment).not.toContain("await settleCheckPaidByIdDetailed({");
    expect(payment).not.toContain("PaymentEngine");
    expect(payment).not.toContain("class PaymentConfirm");
    expect(payment).not.toContain("withCheckOwnedTransaction");
    expect(payment).not.toContain("db.transaction");
    expect(payment).not.toContain("beginTransaction");
    expect(read(CHECK)).toContain("export async function settleCheckPaidByIdDetailed");
    expect(read(CHECK)).toContain("async function finalizeOpenCheckById");
  });

  it("does not introduce a second settlement implementation, payments table, or PaymentEngine", () => {
    const schema = read(SCHEMA);
    const journal = read(JOURNAL);
    const payment = read(PAYMENT);
    expect(journal).toContain("0095_check_charges");
    expect(journal).toContain("0096_payment_collection_facts");
    expect(journal).not.toContain("0096_payments");
    const drizzleFiles = readdirSync(join(repoRoot, "drizzle"));
    expect(drizzleFiles).toContain("0096_payment_collection_facts.sql");
    expect(drizzleFiles.some((name) => name.startsWith("0096_payments"))).toBe(false);
    expect(existsSync(join(repoRoot, "drizzle/0096_payments.sql"))).toBe(false);
    expect(schema).toContain("export const operationalChecks");
    expect(schema).toContain("export const checkSettlementTransactions");
    expect(schema).toContain("export const settlementRecords");
    expect(schema).not.toMatch(/mysqlTable\(\s*"payments"/);
    expect(schema).not.toMatch(
      /export const payments\b|export const paymentAggregates|export const paymentTransactions|export const paymentEngine/
    );
    expect(payment).not.toContain("computeCheckMoney");
    expect(payment).not.toContain("PaymentMoneyCalculator");
    expect(payment).not.toContain("PaymentTaxEngine");
    expect(payment).not.toContain("PaymentDiscountEngine");
    expect(payment).not.toContain("PaymentTotalEngine");
    expect(payment).not.toContain("insertSettlementTransactions");
    expect(payment).not.toContain("createSettlementRecordForCheckFinalize");
  });

  it("does not wrap confirmPayment in a second financial transaction", () => {
    const settleOrder = read(SETTLE_ORDER);
    const counter = read(COUNTER);
    const settlePaid = sliceDefaultSettlePaid(read(POS));
    expect(read(SESSION)).not.toContain("await confirmPayment({");
    expect(settleOrder).not.toContain("withCheckOwnedTransaction");
    expect(settleOrder).not.toContain("db.transaction");
    expect(counter).not.toContain("withCheckOwnedTransaction");
    expect(counter).not.toContain("db.transaction");
    expect(settlePaid).not.toContain("withCheckOwnedTransaction");
    expect(settlePaid).not.toContain("db.transaction");
    expect(read(CHECK)).toContain("withCheckOwnedTransaction");
  });

  it("preserves Check aggregate, Settlement Record, Order operational boundary, and Refund", () => {
    const check = read(CHECK);
    const refund = read(REFUND);
    const settleOrder = read(SETTLE_ORDER);
    const counter = read(COUNTER);
    const session = read(SESSION);
    expect(check).toContain("createSettlementRecordForCheckFinalize");
    expect(check).toContain("insertSettlementTransactions");
    expect(check).toContain("applyFullSettlementToCheckOrders");
    expect(check).toContain("PAYMENT-CONFIRM-SERVICE-1 / I-PAY-14");
    expect(settleOrder).not.toContain("insertOrder(");
    expect(settleOrder).not.toContain("createOrder(");
    expect(counter).toContain("voidCheckByIdDetailed");
    expect(session).not.toContain("settleCheckComplimentaryByIdDetailed");
    expect(session).not.toContain("confirmPayment");
    expect(session).toContain("export async function markComplimentary");
    expect(refund).toContain("production Collection Fact.amount");
    expect(refund).toContain("Applied refunds remain the existing refund SR chain");
    expect(read(PAYMENT)).not.toContain("applyRefundOnCheck");
    expect(read(PAYMENT)).not.toContain("createRefund");
  });

  it("does not create a second production Confirm Payment settlement path", () => {
    const allowedDirectSettle = new Set([
      PAYMENT,
      CHECK,
    ]);
    const scanned = [
      ...walkTs("server/diningSession"),
      ...walkTs("server/order/application"),
      ...walkTs("server/pos/services"),
      ...walkTs("server/operational-session/payment"),
      ...walkTs("server/operational-session/check"),
      "server/routers.ts",
      "server/pos/api/posRouter.ts",
    ];
    const unexpected: string[] = [];
    for (const file of scanned) {
      if (file.includes("/__tests__/") || file.endsWith(".test.ts")) continue;
      if (allowedDirectSettle.has(file)) continue;
      const src = read(file);
      if (src.includes("await settleCheckPaidByIdDetailed")) {
        unexpected.push(file);
      }
    }
    expect(unexpected).toEqual([]);
    expect(read(PAYMENT)).not.toContain("await settleCheckPaidByIdDetailed({");
  });
});
