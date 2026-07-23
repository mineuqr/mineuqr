/**
 * MULTI-CHECK-ALLOCATION-PRESENTATION-1 — API contract aliases for presentation.
 * Presentation consumes RouterOutputs only — never Domain / Projection store.
 */

import type { RouterOutputs } from "@/lib/trpc";

export type MultiCheckAllocationApiDto =
  RouterOutputs["multiCheckAllocation"]["getAllocation"];

export type MultiCheckAllocationApiList =
  RouterOutputs["multiCheckAllocation"]["listAllocations"];

export type MultiCheckAllocationSummaryApiDto =
  RouterOutputs["multiCheckAllocation"]["getAllocationSummary"];

export type MultiCheckAllocationSummaryApiList =
  RouterOutputs["multiCheckAllocation"]["listSummariesBySourceCheck"];

export type MultiCheckAllocationTimelineApiDto =
  RouterOutputs["multiCheckAllocation"]["getAllocationTimeline"];

export type MultiCheckAllocationResponsibilityApiDto =
  RouterOutputs["multiCheckAllocation"]["getAllocationResponsibility"];

export type MultiCheckAllocationProjectionCatalogApiDto =
  RouterOutputs["multiCheckAllocation"]["getProjectionMetadata"];

export type MultiCheckAllocationCommandResultApiDto =
  RouterOutputs["multiCheckAllocation"]["createAllocation"];
