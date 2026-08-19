/**
 * PAYMENT-READINESS-CHECK-ENSURE-STAGE-INSTRUMENTATION-1
 * Stage collector math. Not financial behavior.
 */
import { describe, expect, it } from "vitest";
import {
  createEmptyChargeInsertTiming,
  createEmptyEnsureCheckForOrderStageMs,
  ensureCheckForOrderStageMetadata,
  finishEnsureCheckForOrderStages,
  recordChargeInsert,
} from "../ensureCheckForOrderStageMs";

describe("ensureCheckForOrderStageMs", () => {
  it("starts with safe nulls for optional stages", () => {
    const stages = createEmptyEnsureCheckForOrderStageMs();
    expect(stages.totalMs).toBe(0);
    expect(stages.membershipLookupMs).toBe(0);
    expect(stages.checkCreated).toBe(false);
    expect(stages.createOpenCheckMs).toBeNull();
    expect(stages.taxSnapshotMs).toBeNull();
    expect(stages.checkInsertMs).toBeNull();
    expect(stages.txWallMs).toBeNull();
    expect(stages.enrollMs).toBeNull();
    expect(stages.chargeCreateMs).toBeNull();
    expect(stages.orderSettlementInsertMs).toBeNull();
    expect(stages.chargeListEnsureMs).toBeNull();
    expect(stages.chargeListSumMs).toBeNull();
    expect(stages.computeCheckMoneyMs).toBeNull();
    expect(stages.checkMoneyPersistMs).toBeNull();
    expect(stages.orderSettlementRecalcMs).toBeNull();
    expect(stages.unaccountedMs).toBeNull();
  });

  it("records Charge insert timings without inventing a batch path", () => {
    const timing = createEmptyChargeInsertTiming();
    recordChargeInsert(timing, 4);
    recordChargeInsert(timing, 11);
    expect(timing.count).toBe(2);
    expect(timing.insertMs).toBe(15);
    expect(timing.maxInsertMs).toBe(11);
  });

  it("computes unaccounted as total minus membership, createOpenCheck, and TX clocks", () => {
    const stages = createEmptyEnsureCheckForOrderStageMs();
    stages.membershipLookupMs = 100;
    stages.createOpenCheckMs = 200;
    stages.txPreparationMs = 50;
    stages.txWallMs = 400;
    stages.enrollMs = 250;
    finishEnsureCheckForOrderStages(stages, 900);
    expect(stages.totalMs).toBe(900);
    expect(stages.unaccountedMs).toBe(150);
  });

  it("treats missing optional stages as zero when computing unaccounted", () => {
    const stages = createEmptyEnsureCheckForOrderStageMs();
    stages.membershipLookupMs = 40;
    finishEnsureCheckForOrderStages(stages, 40);
    expect(stages.createOpenCheckMs).toBeNull();
    expect(stages.txWallMs).toBeNull();
    expect(stages.unaccountedMs).toBe(0);
  });

  it("exposes structured metadata without financial amounts", () => {
    const stages = createEmptyEnsureCheckForOrderStageMs();
    stages.totalMs = 12;
    stages.checkCreated = true;
    const metadata = ensureCheckForOrderStageMetadata(stages);
    expect(metadata.ensureTotalMs).toBe(12);
    expect(metadata.checkCreated).toBe(true);
    expect(metadata).not.toHaveProperty("grandTotal");
    expect(metadata).not.toHaveProperty("taxAmount");
    expect(metadata).not.toHaveProperty("subtotal");
  });
});
