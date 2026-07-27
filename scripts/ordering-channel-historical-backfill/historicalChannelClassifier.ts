/**
 * ORDERING-CHANNEL-HISTORICAL-BACKFILL-1 — Phase 1 classification (pure).
 * Does not write. CERTAIN-only eligibility for any future execution.
 */

export type HistoricalChannelConfidence = "CERTAIN" | "LIKELY" | "UNKNOWN";

export type HistoricalOrderEvidence = Readonly<{
  orderingChannel: string | null | undefined;
  identityScope: string | null | undefined;
  fulfilmentAnchorType: string | null | undefined;
  serviceMode: string | null | undefined;
  sessionId: number | null | undefined;
}>;

export type HistoricalChannelClassification = Readonly<{
  confidence: HistoricalChannelConfidence;
  /** Proposed OrderingChannelId only when CERTAIN (else null). */
  proposedChannel: string | null;
  eligibleForBackfill: boolean;
  reason: string;
}>;

/**
 * Classify a historical order for optional OrderingChannelId backfill.
 *
 * CERTAIN requires persisted OrderingChannelId already present, or equivalent
 * unambiguous channel provenance that is NOT Business Identity scope alone.
 * identityScope / fulfilment heuristics are never CERTAIN (ORDERING-CHANNEL-GOVERNANCE-1).
 */
export function classifyHistoricalOrderingChannel(
  evidence: HistoricalOrderEvidence
): HistoricalChannelClassification {
  const stamped = evidence.orderingChannel?.trim() || null;
  if (stamped) {
    return {
      confidence: "CERTAIN",
      proposedChannel: stamped,
      eligibleForBackfill: false,
      reason: "Already stamped — no backfill required",
    };
  }

  const scope = (evidence.identityScope ?? "").trim().toUpperCase();
  const anchor = (evidence.fulfilmentAnchorType ?? "").trim();
  const mode = (evidence.serviceMode ?? "").trim();

  // WAITER BI scope is only written by waiter place paths today — LIKELY, not CERTAIN.
  // BI scope is sequence partition, not OrderingChannelId SSOT.
  if (scope === "WAITER" && anchor === "table" && mode === "table_service") {
    return {
      confidence: "LIKELY",
      proposedChannel: null,
      eligibleForBackfill: false,
      reason:
        "Waiter BI scope + table fulfilment suggests waiter_tablet but is not OrderingChannelId SSOT",
    };
  }

  // KIOSK BI scope is also derived for station/counter/take_away/pickup/queue/drive_thru
  // (resolveBusinessIdentityScope) — cannot prove Self Ordering Kiosk channel.
  if (scope === "KIOSK") {
    return {
      confidence: "LIKELY",
      proposedChannel: null,
      eligibleForBackfill: false,
      reason:
        "KIOSK BI scope / station-counter signature is ambiguous across non-table channels",
    };
  }

  // TABLE scope conflates QR Ordering vs Table Session (governance observation).
  if (scope === "TABLE" || anchor === "table" || mode === "table_service") {
    return {
      confidence: "UNKNOWN",
      proposedChannel: null,
      eligibleForBackfill: false,
      reason:
        "TABLE BI / table fulfilment cannot distinguish qr vs table_session",
    };
  }

  return {
    confidence: "UNKNOWN",
    proposedChannel: null,
    eligibleForBackfill: false,
    reason: "No canonical OrderingChannelId evidence",
  };
}
