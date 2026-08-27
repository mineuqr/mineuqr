import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("SETTLEMENT-PAYMENT-METHOD-CAPTURE-1 architecture guards", () => {
  it("Session UI sends payment and complimentary to Cashier", () => {
    const bar = read("client/src/components/dashboard/DiningSessionActionBar.tsx");
    const row = read("client/src/components/dashboard/SessionRowQuickActions.tsx");
    expect(bar).toContain("sendToCashier");
    expect(bar).toContain("handoffOperationalOrderToCashier");
    expect(bar).not.toContain("MarkPaidSettlementDialog");
    expect(row).toContain("sendToCashier");
    expect(row).toContain("handoffOperationalOrderToCashier");
    expect(row).not.toContain("MarkPaidSettlementDialog");
  });

  it("presentation uses canonical catalog + Product Semantics labels", () => {
    const pres = read("client/src/lib/settlementPaymentMethodPresentation.ts");
    expect(pres).toContain("SELECTABLE_PAYMENT_METHODS");
    expect(pres).toContain("preferredPaymentMethodLabel");
    expect(pres).not.toMatch(/Cash.*Mada.*Visa/);
    expect(pres).not.toContain("mada");
  });

  it("session service no longer settles money; tenders remain Cashier Confirm input", () => {
    const svc = read("server/diningSession/sessionService.ts");
    expect(svc).toContain("SETTLEMENT-PAYMENT-METHOD-CAPTURE-1");
    expect(svc).toContain("settlements?: readonly StaffSettlementLineInput[]");
    expect(svc).not.toContain("confirmPayment");
  });

  it("domain resolves staff lines; legacy other fallback preserved", () => {
    const check = read("server/operational-session/check/CheckService.ts");
    const invariants = read(
      "shared/operational-session/check/settlementInvariants.ts"
    );
    expect(check).toContain("resolveStaffSettlementLines");
    expect(check).toContain("defaultPaidSettlementLine");
    expect(invariants).toContain("resolveStaffSettlementLines");
    expect(invariants).toContain("Multi-tender settlement lines require an amount");
  });

  it("reporting PaymentMethodAnalyticsService consumes Settlement Record publication", () => {
    const analytics = read(
      "server/reporting-platform/PaymentMethodAnalyticsService.ts"
    );
    expect(analytics).toContain("listSettlementRecordPaymentLinesForReporting");
    expect(analytics).not.toContain("SETTLEMENT-PAYMENT-METHOD-CAPTURE-1");
  });
});
