/**
 * MULTI-CHECK-ALLOCATION-PRESENTATION-1 — presentation barrel.
 *
 * PRODUCTION-ADOPTION-1 Rev 2.0: UI is dormant (not mounted in Check Workspace).
 * Library + components remain for reactivation. Core platform stays active.
 */

export {
  MULTI_CHECK_ALLOCATION_CAPABILITY_STATUS,
  MULTI_CHECK_ALLOCATION_UI_ENABLED,
  MULTI_CHECK_ALLOCATION_CORE_ACTIVE,
  MULTI_CHECK_ALLOCATION_REACTIVATION_SUPPORTED,
  isMultiCheckAllocationUiEnabled,
} from "./multiCheckAllocationCapability";

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
