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
  settlementPaymentStatusLabel,
  type SettlementRecordLang,
  type SettlementRecordUiKey,
} from "./settlementRecordCopy";

export {
  settlementHistoryFiltersForStatusFacet,
  type SettlementHistoryStatusFacet,
  type SettlementHistoryApiFilters,
} from "./settlementHistoryFilterPresentation";

export {
  toSettlementChainViewModel,
  type SettlementChainEventViewModel,
} from "./settlementChainPresentation";

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
  useSettlementRecordsByCheck,
  useInvalidateSettlementRecordQueries,
  useCheckRefundBudget,
  useLookupCheckRefundBySettlementNumber,
  useApplyCheckRefund,
} from "./useSettlementRecordQueries";

export {
  isRefundActionVisible,
  type RefundActionVisibilityInput,
} from "./refundWorkflowPresentation";

export { formatElapsedRefundWindow } from "./refundWindowPresentation";

export {
  mapCheckRefundApiError,
  checkRefundErrorMessage,
  type CheckRefundErrorKind,
} from "./checkRefundErrorPresentation";

export type {
  CheckRefundBudgetApiDto,
  CheckRefundApplyResultApiDto,
} from "./checkRefundApiTypes";

export { parseSettlementOperationalIdentity } from "@shared/operational-document-identity";
