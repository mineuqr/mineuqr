/**
 * CASHIER-PAYMENT-FLOW-BOUNDARY-INSTRUMENTATION-1
 * Server POS command duration telemetry guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("CASHIER-PAYMENT-FLOW-BOUNDARY-INSTRUMENTATION-1 server architecture", () => {
  it("does not introduce a new logging framework, schema, or financial aggregate", () => {
    const clock = read("server/pos/observability/posCommandClock.ts");
    const taxonomy = read("server/_core/opsTaxonomy.ts");
    const schema = read("drizzle/schema.ts");
    expect(clock).toContain("Date.now()");
    expect(clock).not.toContain("opsLog");
    expect(taxonomy).toContain("pos_check_intake");
    expect(taxonomy).toContain("pos_check_read");
    expect(taxonomy).toContain("pos_settlement_initiate");
    expect(taxonomy).toContain("cashier_payment_flow");
    expect(schema).not.toMatch(
      /export const cashierPaymentFlows|export const posPaymentFlows|cashierFlowId/
    );
    expect(schema).toContain("export const operationalChecks");
  });

  it("does not await Relay or enroll Check inside sale as a side effect of timing", () => {
    const sale = read("server/pos/services/PosSaleService.ts");
    expect(sale).toContain("awaitRelay: false");
    expect(sale).toContain("enrollCheck: false");
    expect(sale).not.toContain("awaitRelay: true");
    expect(sale).not.toContain("enrollCheck: true");
  });
});
