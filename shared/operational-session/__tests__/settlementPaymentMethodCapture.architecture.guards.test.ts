import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("SETTLEMENT-PAYMENT-METHOD-CAPTURE-1 architecture guards", () => {
  it("Mark Paid UI captures tenders via MarkPaidSettlementDialog", () => {
    const bar = read("client/src/components/dashboard/DiningSessionActionBar.tsx");
    const row = read("client/src/components/dashboard/SessionRowQuickActions.tsx");
    const dialog = read(
      "client/src/components/dashboard/MarkPaidSettlementDialog.tsx"
    );
    expect(bar).toContain("MarkPaidSettlementDialog");
    expect(bar).toContain("settlements");
    expect(row).toContain("MarkPaidSettlementDialog");
    expect(dialog).toContain("listMonetaryPaymentMethodOptions");
    expect(dialog).toContain("singleTenderSettlements");
  });

  it("presentation uses canonical catalog + Product Semantics labels", () => {
    const pres = read("client/src/lib/settlementPaymentMethodPresentation.ts");
    expect(pres).toContain("SELECTABLE_PAYMENT_METHODS");
    expect(pres).toContain("preferredPaymentMethodLabel");
    expect(pres).not.toMatch(/Cash.*Mada.*Visa/);
    expect(pres).not.toContain("mada");
  });

  it("session service passes settlements into settleCheckPaidByIdDetailed", () => {
    const svc = read("server/diningSession/sessionService.ts");
    expect(svc).toContain("SETTLEMENT-PAYMENT-METHOD-CAPTURE-1");
    expect(svc).toContain("input.settlements");
    expect(svc).toMatch(/settleCheckPaidByIdDetailed\(\{[\s\S]*settlements/);
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
