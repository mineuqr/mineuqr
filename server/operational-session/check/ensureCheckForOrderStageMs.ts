/**
 * PAYMENT-READINESS-CHECK-ENSURE-STAGE-INSTRUMENTATION-1
 * Observability-only stage clocks for ensureCheckForOrder.
 * Not financial identity. Durations use Date.now() (same as POS command clocks).
 */

export type EnsureCheckForOrderStageMs = {
  totalMs: number;
  membershipLookupMs: number;
  checkCreated: boolean;
  createOpenCheckMs: number | null;
  taxSnapshotMs: number | null;
  checkInsertMs: number | null;
  computeCheckMoneySeedMs: number | null;
  txPreparationMs: number | null;
  txWallMs: number | null;
  txWriteMs: number | null;
  enrollMs: number | null;
  chargeCreateMs: number | null;
  chargeInsertCount: number | null;
  chargeInsertMs: number | null;
  chargeInsertMaxMs: number | null;
  orderSettlementInsertMs: number | null;
  chargeListEnsureMs: number | null;
  chargeListSumMs: number | null;
  computeCheckMoneyMs: number | null;
  checkMoneyPersistMs: number | null;
  orderSettlementRecalcMs: number | null;
  checkReloadMs: number | null;
  unaccountedMs: number | null;
};

export type ChargeInsertTiming = {
  count: number;
  insertMs: number;
  maxInsertMs: number;
  createMs: number;
};

export function createEmptyEnsureCheckForOrderStageMs(): EnsureCheckForOrderStageMs {
  return {
    totalMs: 0,
    membershipLookupMs: 0,
    checkCreated: false,
    createOpenCheckMs: null,
    taxSnapshotMs: null,
    checkInsertMs: null,
    computeCheckMoneySeedMs: null,
    txPreparationMs: null,
    txWallMs: null,
    txWriteMs: null,
    enrollMs: null,
    chargeCreateMs: null,
    chargeInsertCount: null,
    chargeInsertMs: null,
    chargeInsertMaxMs: null,
    orderSettlementInsertMs: null,
    chargeListEnsureMs: null,
    chargeListSumMs: null,
    computeCheckMoneyMs: null,
    checkMoneyPersistMs: null,
    orderSettlementRecalcMs: null,
    checkReloadMs: null,
    unaccountedMs: null,
  };
}

export function createEmptyChargeInsertTiming(): ChargeInsertTiming {
  return { count: 0, insertMs: 0, maxInsertMs: 0, createMs: 0 };
}

export function recordChargeInsert(timing: ChargeInsertTiming, insertMs: number): void {
  timing.count += 1;
  timing.insertMs += insertMs;
  if (insertMs > timing.maxInsertMs) timing.maxInsertMs = insertMs;
}

export function finishEnsureCheckForOrderStages(
  stages: EnsureCheckForOrderStageMs,
  totalMs: number
): EnsureCheckForOrderStageMs {
  const accounted =
    stages.membershipLookupMs +
    (stages.createOpenCheckMs ?? 0) +
    (stages.txPreparationMs ?? 0) +
    (stages.txWallMs ?? 0);
  stages.totalMs = totalMs;
  const gap = totalMs - accounted;
  stages.unaccountedMs = Number.isFinite(gap) && gap >= 0 ? gap : 0;
  return stages;
}

export function ensureCheckForOrderStageMetadata(
  stages: EnsureCheckForOrderStageMs
): Record<string, number | boolean | null> {
  return {
    ensureTotalMs: stages.totalMs,
    membershipLookupMs: stages.membershipLookupMs,
    checkCreated: stages.checkCreated,
    createOpenCheckMs: stages.createOpenCheckMs,
    taxSnapshotMs: stages.taxSnapshotMs,
    checkInsertMs: stages.checkInsertMs,
    computeCheckMoneySeedMs: stages.computeCheckMoneySeedMs,
    txPreparationMs: stages.txPreparationMs,
    txWallMs: stages.txWallMs,
    txWriteMs: stages.txWriteMs,
    enrollMs: stages.enrollMs,
    chargeCreateMs: stages.chargeCreateMs,
    chargeInsertCount: stages.chargeInsertCount,
    chargeInsertMs: stages.chargeInsertMs,
    chargeInsertMaxMs: stages.chargeInsertMaxMs,
    orderSettlementInsertMs: stages.orderSettlementInsertMs,
    chargeListEnsureMs: stages.chargeListEnsureMs,
    chargeListSumMs: stages.chargeListSumMs,
    computeCheckMoneyMs: stages.computeCheckMoneyMs,
    checkMoneyPersistMs: stages.checkMoneyPersistMs,
    orderSettlementRecalcMs: stages.orderSettlementRecalcMs,
    checkReloadMs: stages.checkReloadMs,
    unaccountedMs: stages.unaccountedMs,
  };
}
