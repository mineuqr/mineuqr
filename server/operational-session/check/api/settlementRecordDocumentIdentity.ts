/**
 * REFUND-DOCUMENT-NUMBERING-ADOPTION-1 — document identity enrichment helpers.
 * Read/presentation plane only.
 */

import {
  formatOperationalIdentity,
  resolveRefundOperationalIdentity,
  resolveSettlementOperationalIdentity,
} from "@shared/operational-document-identity";
import type { SettlementRecord } from "@shared/operational-session";

export type SettlementRecordDocumentIdentity = Readonly<{
  documentType: "settlement" | "refund";
  /** Primary operator-facing document number (ST-… or RF-…). */
  documentNumber: string;
  /** Alias of documentNumber for backward-compatible DTO field `settlementNumber`. */
  settlementNumber: string;
  /** RF-… when refund and sequence known; otherwise null. */
  refundNumber: string | null;
  /** Origin Settlement ST-… for refund documents; null for settlements. */
  originSettlementNumber: string | null;
  refundSequence: number | null;
}>;

/**
 * Resolve polymorphic document identity for a Settlement Record row.
 * Refunds without an allocated sequence fall back to historical ST display
 * (pre-numbering records) until backfill/allocation binds RF-.
 */
export function resolveSettlementRecordDocumentIdentity(
  record: SettlementRecord,
  refundSequence: number | null | undefined
): SettlementRecordDocumentIdentity {
  const originSettlementNumber = resolveSettlementOperationalIdentity({
    checkId: record.checkId,
  });

  if (record.recordKind === "refund") {
    if (refundSequence != null && refundSequence > 0) {
      const refundNumber = resolveRefundOperationalIdentity({
        sequence: refundSequence,
      });
      return {
        documentType: "refund",
        documentNumber: refundNumber,
        settlementNumber: refundNumber,
        refundNumber,
        originSettlementNumber,
        refundSequence,
      };
    }
    // Historical fallback — retain prior ST-generation display until RF bound.
    const legacy = formatOperationalIdentity({
      documentType: "settlement",
      sequence: record.checkId,
      generation: record.recordGeneration,
    });
    return {
      documentType: "refund",
      documentNumber: legacy,
      settlementNumber: legacy,
      refundNumber: null,
      originSettlementNumber,
      refundSequence: null,
    };
  }

  return {
    documentType: "settlement",
    documentNumber: originSettlementNumber,
    settlementNumber: originSettlementNumber,
    refundNumber: null,
    originSettlementNumber: null,
    refundSequence: null,
  };
}
