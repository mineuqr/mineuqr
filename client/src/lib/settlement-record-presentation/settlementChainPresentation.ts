/**
 * REFUND-PRESENTATION-ADOPTION-1 — compensating chain visualization (presentation only).
 * Orders Settlement Record detail DTOs by generation / time — no money math.
 */

import { resolveSettlementOperationalIdentity } from "@shared/operational-document-identity";
import type { SettlementRecordDetailApiDto } from "./settlementRecordApiTypes";
import {
  settlementRecordUiLabel,
  settlementStatusLabel,
  type SettlementRecordLang,
} from "./settlementRecordCopy";

export type SettlementChainEventViewModel = Readonly<{
  settlementRecordId: string;
  settlementNumber: string;
  statusLabel: string;
  recordKindLabel: string;
  generationLabel: string;
  timeLabel: string;
  grandTotalLabel: string;
  priorSettlementRecordId: string | null;
  isCurrent: boolean;
}>;

function recordKindLabel(
  kind: string,
  language: SettlementRecordLang
): string {
  if (kind === "refund") return settlementRecordUiLabel("kindRefund", language);
  if (kind === "void") return settlementRecordUiLabel("kindVoid", language);
  if (kind === "reversal") {
    return settlementRecordUiLabel("kindReversal", language);
  }
  if (kind === "correction") {
    return settlementRecordUiLabel("kindCorrection", language);
  }
  return settlementRecordUiLabel("kindSettlement", language);
}

/**
 * Chronological chain (oldest → newest) for a Check's Settlement publications.
 */
export function toSettlementChainViewModel(
  records: readonly SettlementRecordDetailApiDto[],
  language: SettlementRecordLang,
  currentSettlementRecordId: string | null
): readonly SettlementChainEventViewModel[] {
  const ordered = [...records].sort((a, b) => {
    if (a.recordGeneration !== b.recordGeneration) {
      return a.recordGeneration - b.recordGeneration;
    }
    if (a.settlementTime !== b.settlementTime) {
      return a.settlementTime < b.settlementTime ? -1 : 1;
    }
    return a.settlementRecordId < b.settlementRecordId ? -1 : 1;
  });

  return ordered.map((record) => {
    const sym = record.financialSnapshot.currencySymbol;
    return {
      settlementRecordId: record.settlementRecordId,
      settlementNumber: resolveSettlementOperationalIdentity({
        checkId: record.checkId,
        settlementRecordId: record.settlementRecordId,
        recordGeneration: record.recordGeneration,
      }),
      statusLabel: settlementStatusLabel(record.settlementStatus, language),
      recordKindLabel: recordKindLabel(record.recordKind, language),
      generationLabel: String(record.recordGeneration),
      timeLabel: record.settlementTime,
      grandTotalLabel: `${sym}${record.grandTotal}`,
      priorSettlementRecordId: record.priorSettlementRecordId,
      isCurrent: record.settlementRecordId === currentSettlementRecordId,
    };
  });
}
