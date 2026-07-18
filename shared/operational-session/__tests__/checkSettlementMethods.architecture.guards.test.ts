import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CHECK_SETTLEMENT_METHODS_PROGRAM_ID,
  DEFAULT_PAID_PAYMENT_METHOD,
  PAYMENT_METHODS,
  paymentMethodCategory,
} from "../check/paymentMethod";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("CHECK-SETTLEMENT-METHODS-1 architecture guards", () => {
  it("registers payment methods including Saudi-relevant tenders", () => {
    expect(CHECK_SETTLEMENT_METHODS_PROGRAM_ID).toBe(
      "CHECK-SETTLEMENT-METHODS-1"
    );
    expect(PAYMENT_METHODS).toEqual(
      expect.arrayContaining([
        "cash",
        "mada",
        "visa",
        "mastercard",
        "apple_pay",
        "stc_pay",
        "bank_transfer",
        "complimentary",
        "other",
      ])
    );
    expect(DEFAULT_PAID_PAYMENT_METHOD).toBe("other");
    expect(paymentMethodCategory("mada")).toBe("card");
    expect(paymentMethodCategory("stc_pay")).toBe("digital_wallet");
  });

  it("persists check_settlement_transactions under Check ownership", () => {
    const schema = read("drizzle/schema.ts");
    const migration = read("drizzle/0070_check_settlement_transactions.sql");
    expect(schema).toContain("checkSettlementTransactions");
    expect(schema).toContain("check_settlement_transactions");
    expect(migration).toContain("CHECK-SETTLEMENT-METHODS-1");
    expect(migration).toContain("check_settlement_transactions");
    expect(migration).toContain("paymentMethod");
  });

  it("CheckService records settlement transactions without gateway logic", () => {
    const svc = read("server/operational-session/check/CheckService.ts");
    expect(svc).toContain("insertSettlementTransactions");
    expect(svc).toContain("defaultPaidSettlementLine");
    // CAPTURE-1 — staff lines resolve via resolveStaffSettlementLines
    // (which calls assertPaidSettlementLines internally).
    expect(svc).toContain("resolveStaffSettlementLines");
    expect(svc).not.toMatch(/stripe|paypal|moyasar|tap\.company/i);
  });

  it("does not change Revenue aggregator formula", () => {
    const agg = read("server/reporting-platform/businessMetricsAggregator.ts");
    expect(agg).toContain("grandTotal");
    expect(agg).toContain('outcome === "paid"');
    expect(agg).not.toContain("check_settlement_transactions");
    expect(agg).not.toContain("paymentMethod");
  });

  it("Reporting adapter is read-only and does not replace Revenue KPI", () => {
    const adapter = read(
      "server/reporting-platform/settlementTransactionReportingAdapter.ts"
    );
    expect(adapter).toContain("not a substitute for Check Revenue");
    expect(adapter).toContain("listCapturedSettlementsByPaymentMethod");
    const router = read("server/reporting-platform/reportingRouter.ts");
    expect(router).not.toContain("listCapturedSettlementsByPaymentMethod");
    expect(router).not.toContain("SettlementDistribution");
  });

  it("session.markPaid accepts optional settlements (CAPTURE-1) with legacy omit path", () => {
    const routers = read("server/routers.ts");
    const markPaidBlock = routers.slice(
      routers.indexOf("markPaid:"),
      routers.indexOf("markPaid:") + 900
    );
    expect(markPaidBlock).toContain("restaurantId");
    expect(markPaidBlock).toContain("sessionId");
    expect(markPaidBlock).toContain("settlements");
    expect(markPaidBlock).toContain("paymentMethod");
    expect(markPaidBlock).toContain("SETTLEMENT-PAYMENT-METHOD-CAPTURE-1");
    expect(markPaidBlock).toContain(".optional()");
  });
});
