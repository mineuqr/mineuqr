/**
 * SETTLEMENT-RECORD-UI-ADOPTION-1 — presentation barrel.
 */

export type {
  SettlementRecordHistoryItemApiDto,
  SettlementRecordHistoryPageApiDto,
  SettlementRecordDetailApiDto,
  SettlementRecordReceiptApiDto,
} from "./settlementRecordApiTypes";

export {
  settlementRecordUiLabels,
  settlementRecordUiLabel,
  settlementStatusLabel,
  type SettlementRecordLang,
  type SettlementRecordUiKey,
} from "./settlementRecordCopy";

export {
  mapSettlementRecordApiError,
  settlementRecordErrorMessage,
  type SettlementRecordErrorKind,
} from "./settlementRecordErrorPresentation";

export {
  toSettlementHistoryRowViewModel,
  toSettlementDetailViewModel,
  toSettlementReceiptViewModel,
  computeRemainingDisplay,
  type SettlementHistoryRowViewModel,
  type SettlementDetailViewModel,
  type SettlementReceiptViewModel,
} from "./settlementRecordViewModel";

export {
  formatOperationalSettlementNumber,
  formatSettlementHistoryTimeParts,
  formatSettlementHistoryTimeLabel,
  settlementQuickRangeBounds,
  defaultSettlementHistoryRange,
  type SettlementQuickRange,
} from "./settlementHistoryPresentation";

/** OI-08 — Settlement Operational Identity via shared platform provider. */
export { resolveSettlementOperationalIdentity } from "@shared/operational-document-identity";

export {
  useSettlementRecordHistory,
  useSettlementRecordDetail,
  useSettlementRecordReceipt,
  useSettlementRecordsBySession,
  useInvalidateSettlementRecordQueries,
} from "./useSettlementRecordQueries";
