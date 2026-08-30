/**
 * POST-PAYMENT-INCOMING-CHECK-RECOVERY-HARDENING-1
 * Incoming Check recovery is post-CF compatibility only. Discovery is the
 * production Collection Fact. Direct cashier_pos stays on the same sweeper.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CASHIER_FINALIZABLE_ORDERING_CHANNELS,
  CASHIER_HANDOFF_ELIGIBLE_ORDERING_CHANNELS,
} from "@shared/pos";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

function sliceFn(src: string, startMarker: string, endMarker: string): string {
  const start = src.indexOf(startMarker);
  const end = src.indexOf(endMarker, start + startMarker.length);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return src.slice(start, end);
}

describe("POST-PAYMENT-INCOMING-CHECK-RECOVERY-HARDENING-1 architecture", () => {
  it("discovers Direct and Incoming production CFs with the Cashier-finalizable channel set", () => {
    expect(CASHIER_FINALIZABLE_ORDERING_CHANNELS).toEqual([
      "cashier_pos",
      "table_session",
      "waiter_tablet",
      "qr",
      "kiosk",
    ]);
    expect(CASHIER_HANDOFF_ELIGIBLE_ORDERING_CHANNELS).not.toContain(
      "cashier_pos"
    );

    const repo = read(
      "server/operational-session/payment/collection-fact/collectionFactRepository.ts"
    );
    const listFn = sliceFn(
      repo,
      "export async function listCashierPosProductionFactsAwaitingDownstreamSettlement",
      "export async function listProductionCollectionFactsAwaitingDrawerAttribution"
    );
    expect(listFn).toContain("CASHIER_FINALIZABLE_ORDERING_CHANNELS");
    expect(listFn).toContain("COLLECTION_FACT_PRODUCTION_PURPOSE");
    expect(listFn).toContain("notExists(completeMembership)");
    expect(listFn).toContain('inArray(operationalChecks.outcome, ["paid", "complimentary"])');
    expect(listFn).not.toContain("CASHIER_HANDOFF_ELIGIBLE");
    expect(listFn).not.toContain("cashier_order_handoffs");
    expect(listFn).not.toContain("eq(\n          paymentCollectionFacts.orderingChannel,\n          ORDERING_CHANNEL_CASHIER_POS");

    const byOrder = sliceFn(
      repo,
      "export async function findProductionCollectionFactByOrderId",
      "export async function listProductionCollectionFactsByOrderId"
    );
    expect(byOrder).not.toContain("orderingChannel");

    const byCheck = sliceFn(
      repo,
      "export async function findProductionCollectionFactByCheckId",
      "export async function findProductionCollectionFactByOrderId"
    );
    expect(byCheck).toContain("ORDERING_CHANNEL_CASHIER_POS");
  });

  it("reuses the existing Check finalizer and does not open a financial retry path", () => {
    const recover = read(
      "server/operational-session/payment/recoverCashierPosDownstreamSettlement.ts"
    );
    const check = read("server/operational-session/check/CheckService.ts");
    const deliver = sliceFn(
      check,
      "export async function deliverCashierPosOperationalSettlementAfterPaid",
      "export async function completeCashierOperationalSettlementAfterCollectionFact"
    );
    const complete = sliceFn(
      check,
      "export async function completeCashierOperationalSettlementAfterCollectionFact",
      "export async function settleCashierPosOrderPaidByIdDetailed"
    );
    const materialize = sliceFn(
      check,
      "async function materializeOrLoadCashierPosOpenCheck",
      "function adoptAttributionAfterOwnedCommit"
    );
    expect(recover).toContain("deliverCashierPosOperationalSettlementAfterPaid");
    expect(recover).toContain("listCashierPosProductionFactsAwaitingDownstreamSettlement");
    expect(recover).not.toContain("commitCollectionFact");
    expect(recover).not.toContain("allocateCashierInvoiceForOrder");
    expect(recover).not.toContain("confirmPayment");
    expect(recover).not.toContain("pos.settlement.initiate");
    expect(recover).not.toContain("closeSession");
    expect(recover).not.toContain("createOrder");
    expect(recover).not.toContain("cashier_order_handoffs");
    expect(recover).not.toContain("updateOrderStatus");
    expect(recover).not.toContain("lockOrderRowForIncomingConfirm");
    expect(deliver).toContain("CheckOrderNotFoundError");
    expect(deliver).toContain("DiningSessionUnavailableError");
    expect(deliver).not.toContain('DiningSessionUnavailableError("Order not found")');
    expect(deliver).toContain("findProductionCollectionFactByOrderId");
    expect(deliver).toContain("completeCashierOperationalSettlementAfterCollectionFact");
    expect(deliver).not.toContain("commitCollectionFact");
    expect(deliver).not.toContain("allocateCashierInvoiceForOrder");
    expect(deliver).not.toContain("closeSession");
    expect(deliver).not.toContain("updateSessionActiveCheckId");
    expect(materialize).toContain("sessionId: null");
    expect(materialize).not.toContain("updateSessionActiveCheckId");
    expect(materialize).not.toContain("closeSession");
    expect(complete).toContain("finalizeOpenCheckById");
    expect(complete).toContain('row.outcome === "voided" || row.outcome === "paid" || row.outcome === "complimentary"');
  });

  it("keeps durability on production CF rows and existing Confirm/Node kick, without cron or schema", () => {
    const recovery = read("server/order/postConfirmOperationalRecovery.ts");
    const index = read("server/_core/index.ts");
    const router = read("server/pos/api/posRouter.ts");
    const vercel = read("vercel.json");
    const journal = read("drizzle/meta/_journal.json");
    expect(recovery).toContain("recoverCashierPosDownstreamSettlements");
    expect(recovery).toContain("schedulePostConfirmOperationalRecovery");
    expect(index).toContain("startPostConfirmOperationalRecoveryLoop()");
    expect(router).toContain("schedulePostConfirmOperationalRecovery()");
    expect(vercel).not.toContain('"crons"');
    expect(vercel).not.toContain("cashier-downstream-recovery");
    expect(journal).toContain("0101_cashier_invoices");
    expect(journal).not.toContain("0102_");
    expect(existsSync(join(repoRoot, "drizzle/0102.sql"))).toBe(false);
    expect(
      existsSync(
        join(repoRoot, "server/operational-session/payment/cashier-downstream-recovery")
      )
    ).toBe(false);
  });
});
