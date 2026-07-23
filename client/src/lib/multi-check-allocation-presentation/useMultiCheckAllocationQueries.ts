/**
 * MULTI-CHECK-ALLOCATION-PRESENTATION-1 — tRPC hooks over multiCheckAllocation.* only.
 */

import { trpc } from "@/lib/trpc";

type Enabled = { enabled?: boolean };

/** Allocations for a source Check — canonical list source. */
export function useMultiCheckAllocationsBySourceCheck(
  input: { restaurantId: number; sourceCheckId: number },
  options: Enabled = {}
) {
  return trpc.multiCheckAllocation.listAllocations.useQuery(input, {
    enabled:
      (options.enabled ?? true) &&
      input.restaurantId > 0 &&
      input.sourceCheckId > 0,
    staleTime: 15_000,
  });
}

export function useMultiCheckAllocation(
  input: { restaurantId: number; allocationId: string },
  options: Enabled = {}
) {
  return trpc.multiCheckAllocation.getAllocation.useQuery(input, {
    enabled:
      (options.enabled ?? true) &&
      input.restaurantId > 0 &&
      input.allocationId.length > 0,
    staleTime: 15_000,
  });
}

export function useMultiCheckAllocationSummary(
  input: { restaurantId: number; allocationId: string },
  options: Enabled = {}
) {
  return trpc.multiCheckAllocation.getAllocationSummary.useQuery(input, {
    enabled:
      (options.enabled ?? true) &&
      input.restaurantId > 0 &&
      input.allocationId.length > 0,
    staleTime: 15_000,
  });
}

export function useMultiCheckAllocationTimeline(
  input: { restaurantId: number; allocationId: string },
  options: Enabled = {}
) {
  return trpc.multiCheckAllocation.getAllocationTimeline.useQuery(input, {
    enabled:
      (options.enabled ?? true) &&
      input.restaurantId > 0 &&
      input.allocationId.length > 0,
    staleTime: 15_000,
  });
}

export function useMultiCheckAllocationResponsibility(
  input: { restaurantId: number; allocationId: string },
  options: Enabled = {}
) {
  return trpc.multiCheckAllocation.getAllocationResponsibility.useQuery(
    input,
    {
      enabled:
        (options.enabled ?? true) &&
        input.restaurantId > 0 &&
        input.allocationId.length > 0,
      staleTime: 15_000,
    }
  );
}

export function useMultiCheckAllocationProjectionMetadata(
  input: { restaurantId: number },
  options: Enabled = {}
) {
  return trpc.multiCheckAllocation.getProjectionMetadata.useQuery(input, {
    enabled: (options.enabled ?? true) && input.restaurantId > 0,
    staleTime: 60_000,
  });
}

/** Invalidate Multi Check Allocation reads after financial mutations. */
export function useInvalidateMultiCheckAllocationQueries() {
  const utils = trpc.useUtils();
  return async () => {
    await Promise.all([
      utils.multiCheckAllocation.listAllocations.invalidate(),
      utils.multiCheckAllocation.listBySourceCheck.invalidate(),
      utils.multiCheckAllocation.listByTargetCheck.invalidate(),
      utils.multiCheckAllocation.listByRestaurant.invalidate(),
      utils.multiCheckAllocation.getAllocation.invalidate(),
      utils.multiCheckAllocation.getAllocationSummary.invalidate(),
      utils.multiCheckAllocation.listSummariesBySourceCheck.invalidate(),
      utils.multiCheckAllocation.getAllocationTimeline.invalidate(),
      utils.multiCheckAllocation.getAllocationResponsibility.invalidate(),
    ]);
  };
}
