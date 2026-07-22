/**
 * SPLIT-PAYMENT-PRESENTATION-ADOPTION-1 — presentation barrel.
 */

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
