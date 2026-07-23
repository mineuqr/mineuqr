/**
 * MULTI-CHECK-ALLOCATION-PRESENTATION-1 — presentation barrel.
 */

export type {
  MultiCheckAllocationApiDto,
  MultiCheckAllocationApiList,
  MultiCheckAllocationSummaryApiDto,
  MultiCheckAllocationSummaryApiList,
  MultiCheckAllocationTimelineApiDto,
  MultiCheckAllocationResponsibilityApiDto,
  MultiCheckAllocationProjectionCatalogApiDto,
  MultiCheckAllocationCommandResultApiDto,
} from "./multiCheckAllocationApiTypes";

export {
  multiCheckAllocationStatusLabels,
  multiCheckAllocationUiLabels,
  multiCheckAllocationStatusLabel,
  multiCheckAllocationUiLabel,
  type MultiCheckAllocationLang,
  type MultiCheckAllocationStatusKey,
} from "./multiCheckAllocationCopy";

export {
  mapMultiCheckAllocationApiError,
  multiCheckAllocationErrorMessage,
  type MultiCheckAllocationErrorKind,
} from "./multiCheckAllocationErrorPresentation";

export {
  toMultiCheckAllocationDetailViewModel,
  toMultiCheckAllocationSummaryViewModel,
  toMultiCheckAllocationTimelineViewModel,
  toMultiCheckAllocationResponsibilityViewModel,
  toMultiCheckAllocationPanelViewModel,
  type MultiCheckAllocationDetailViewModel,
  type MultiCheckAllocationSummaryViewModel,
  type MultiCheckAllocationPortionViewModel,
  type MultiCheckAllocationAdjustmentViewModel,
  type MultiCheckAllocationReversalViewModel,
  type MultiCheckAllocationTimelineEntryViewModel,
  type MultiCheckAllocationResponsibilityViewModel,
  type MultiCheckAllocationProjectionMetaViewModel,
  type MultiCheckAllocationPanelViewModel,
} from "./multiCheckAllocationViewModel";

export {
  useMultiCheckAllocationsBySourceCheck,
  useMultiCheckAllocation,
  useMultiCheckAllocationSummary,
  useMultiCheckAllocationTimeline,
  useMultiCheckAllocationResponsibility,
  useMultiCheckAllocationProjectionMetadata,
  useInvalidateMultiCheckAllocationQueries,
} from "./useMultiCheckAllocationQueries";

export { useMultiCheckAllocationMutations } from "./useMultiCheckAllocationMutations";
