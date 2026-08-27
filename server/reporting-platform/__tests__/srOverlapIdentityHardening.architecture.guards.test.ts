/**
 * SR-OVERLAP-IDENTITY-HARDENING-1 — architecture guards.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("SR-OVERLAP-IDENTITY-HARDENING-1 architecture", () => {
  it("does not treat checkId as economic identity and does not match on time or LIMIT", () => {
    const identity = read(
      "shared/reporting-platform/revenue-union/revenueUnionIdentity.ts"
    );
    const resolver = read(
      "shared/reporting-platform/revenue-union/revenueUnionResolver.ts"
    );
    const proven = identity.slice(
      identity.indexOf("export function provenEconomicSaleOverlap"),
      identity.indexOf("export function unsafeEconomicIdentityCollision")
    );
    expect(identity).toContain("checkId is not economic identity");
    expect(identity).toContain("resolveLegacyOrderIdsForOverlap");
    expect(proven).not.toMatch(/\.(checkId)\b/);
    expect(proven).not.toContain("settledAt");
    expect(proven).not.toContain("committedAt");
    expect(proven).not.toContain("LIMIT");
    expect(resolver).not.toContain("checkOverlapKey");
    expect(resolver).not.toContain(".limit(");
    expect(resolver).not.toMatch(/Date\.now\(/);
    expect(resolver).toContain("provenEconomicSaleOverlap");
  });

  it("recovers empty orderRefs only from singleton Check membership and fails closed", () => {
    const identity = read(
      "shared/reporting-platform/revenue-union/revenueUnionIdentity.ts"
    );
    const service = read(
      "server/reporting-platform/revenue-union/RevenueUnionService.ts"
    );
    expect(identity).toContain("Multi-order or empty membership fails closed");
    expect(service).toContain("loadMembershipOrderIdsForEmptySettlementRefs");
    expect(service).toContain("row.orderRefs.length === 0");
    expect(service).toContain("catch {");
    expect(service).not.toContain("commitCollectionFact");
    expect(service).not.toContain("insertSettlementRecord");
  });

  it("does not change Confirm, CF writers, refunds, CRMP, or ST/OS", () => {
    const confirm = read(
      "server/operational-session/payment/PaymentConfirmService.ts"
    );
    const cfWriter = read(
      "server/operational-session/payment/collection-fact/CollectionFactService.ts"
    );
    const refund = read(
      "server/operational-session/check/checkRefundIntegration.ts"
    );
    const crmp = read(
      "server/operational-session/check/checkSettlementAttributionAdoption.ts"
    );
    const st = read(
      "server/operational-session/check/settlementTransactionRepository.ts"
    );
    const os = read(
      "server/operational-session/check/orderSettlementRepository.ts"
    );
    for (const body of [confirm, cfWriter, refund, crmp, st, os]) {
      expect(body).not.toContain("resolveLegacyOrderIdsForOverlap");
      expect(body).not.toContain("PRODUCTION_OVERLAP");
    }
  });

  it("does not create 0101 and leaves 0098–0100 untouched", () => {
    const sql = readdirSync(join(repoRoot, "drizzle")).filter((name) =>
      name.endsWith(".sql")
    );
    expect(sql.some((name) => name.startsWith("0101"))).toBe(false);
    expect(existsSync(join(repoRoot, "drizzle/0101.sql"))).toBe(false);
    const journal = read("drizzle/meta/_journal.json");
    expect(journal).toContain("0098_pos_sale_idempotency_open_check");
    expect(journal).toContain("0099_cashier_order_handoffs");
    expect(journal).toContain("0100_crmp_collection_fact_attribution");
    expect(journal).not.toContain("0101_");
    const sql0098 = read("drizzle/0098_pos_sale_idempotency_open_check.sql");
    const sql0099 = read("drizzle/0099_cashier_order_handoffs.sql");
    const sql0100 = read("drizzle/0100_crmp_collection_fact_attribution.sql");
    expect(sql0098).toContain("ALTER TABLE `pos_sale_idempotency`");
    expect(sql0099).toContain("CREATE TABLE `cashier_order_handoffs`");
    expect(sql0100).toContain("collectionFactId");
  });
});
