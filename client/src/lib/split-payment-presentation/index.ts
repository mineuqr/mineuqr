/**
 * SPLIT-PAYMENT-PRESENTATION-ADOPTION-1 — presentation barrel.
 *
 * SETTLEMENT-UI-CLEANUP-1: operator UI is dormant (not mounted in Check Workspace).
 * Library + components remain for reactivation. Core platform stays active.
 */

export {
  SPLIT_PAYMENT_CAPABILITY_STATUS,
  SPLIT_PAYMENT_UI_ENABLED,
  SPLIT_PAYMENT_CORE_ACTIVE,
  SPLIT_PAYMENT_REACTIVATION_SUPPORTED,
  isSplitPaymentUiEnabled,
} from "./splitPaymentCapability";

export type {
  SplitPaymentApiDto,
  SplitPaymentApiList,
  SplitPaymentOutstandingApiDto,
  SplitPaymentSummaryApiDto,
  SplitPaymentTimelineApiDto,
  SplitPaymentAttemptApiDto,
  SplitPaymentAttemptApiList,
  SplitPaymentProjectionCatalogApiDto,
} from "./splitPaymentApiTypes";

export {
  splitPaymentStatusLabels,
  splitPaymentAttemptStatusLabels,
  splitPaymentUiLabels,
  splitPaymentStatusLabel,
  splitPaymentAttemptStatusLabel,
  splitPaymentUiLabel,
  type SplitPaymentLang,
  type SplitPaymentStatusKey,
  type SplitPaymentAttemptStatusKey,
} from "./splitPaymentCopy";

export {
  mapSplitPaymentApiError,
  splitPaymentErrorMessage,
  type SplitPaymentErrorKind,
} from "./splitPaymentErrorPresentation";

export {
  toSplitPaymentDetailViewModel,
  toSplitPaymentOutstandingViewModel,
  toSplitPaymentSummaryViewModel,
  toSplitPaymentTimelineViewModel,
  toSplitPaymentAttemptViewModel,
  toSplitPaymentAttemptViewModelList,
  toSplitPaymentPanelViewModel,
  type SplitPaymentDetailViewModel,
  type SplitPaymentOutstandingViewModel,
  type SplitPaymentSummaryViewModel,
  type SplitPaymentTimelineViewModel,
  type SplitPaymentAttemptViewModel,
  type SplitPaymentTenderBreakdownViewModel,
  type SplitPaymentAllocationViewModel,
  type ProjectionMetadataViewModel,
  type SplitPaymentPanelViewModel,
} from "./splitPaymentViewModel";

export {
  useSplitPaymentsByCheck,
  useSplitPaymentOutstanding,
  useSplitPaymentSummaryByCheck,
  useSplitPaymentTimeline,
  useSplitPaymentAttempts,
  useSplitPaymentAttemptsByCheck,
  useSplitPaymentProjectionMetadata,
  useInvalidateSplitPaymentQueries,
} from "./useSplitPaymentQueries";
