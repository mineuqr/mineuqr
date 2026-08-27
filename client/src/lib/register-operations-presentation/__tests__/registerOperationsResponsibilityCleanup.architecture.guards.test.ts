/**
 * REGISTER-OPERATIONS-RESPONSIBILITY-CLEANUP-1 — architecture guards.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("REGISTER-OPERATIONS-RESPONSIBILITY-CLEANUP-1 guards", () => {
  it("Register Ops hosts no unpaid Order queue UI", () => {
    const ops = read(
      "client/src/components/register-operations/RegisterOperationsPanel.tsx"
    );
    expect(ops).toContain("REGISTER-OPERATIONS-RESPONSIBILITY-CLEANUP-1");
    expect(ops).not.toContain("CounterPickupCashierPanel");
    expect(ops).not.toContain("listUnpaidCounterPickup");
    expect(ops).not.toContain("Unpaid counter");
    expect(ops).not.toContain("طلبات الكاونتر غير المدفوعة");
    expect(
      existsSync(
        join(
          repoRoot,
          "client/src/components/register-operations/CounterPickupCashierPanel.tsx"
        )
      )
    ).toBe(false);
  });

  it("Orders Workspace retains unpaid Self Ordering settle/cancel", () => {
    const orders = read(
      "client/src/components/orders-workspace/OrdersWorkspacePanel.tsx"
    );
    expect(orders).toContain("listUnpaidCounterPickup");
    expect(orders).toContain("staffSettleCounterPickup");
    expect(orders).toContain("staffCancelCounterPickup");
    expect(orders).toContain("MarkPaidSettlementDialog");
    expect(orders).toContain("send-to-cashier");
  });

  it("does not redesign Settlement / Register / Shift / Reporting", () => {
    const ops = read(
      "client/src/components/register-operations/RegisterOperationsPanel.tsx"
    );
    expect(ops).toContain("crmp");
    expect(ops).toMatch(/financialShift|FinancialShift/);
    const lifecycle = read(
      "shared/operational-session/check/lifecycleSettlementGuards.ts"
    );
    expect(lifecycle).toContain("LIFECYCLE-SETTLEMENT-GUARDS-1");
  });
});
