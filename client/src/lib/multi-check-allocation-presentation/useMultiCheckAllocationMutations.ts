/**
 * MULTI-CHECK-ALLOCATION-PRESENTATION-1 — mutation hooks over multiCheckAllocation.* only.
 * Invalidates Projection reads after success. No local business-state mutation.
 */

import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  mapMultiCheckAllocationApiError,
  multiCheckAllocationErrorMessage,
} from "./multiCheckAllocationErrorPresentation";
import {
  multiCheckAllocationUiLabel,
  type MultiCheckAllocationLang,
} from "./multiCheckAllocationCopy";
import { useInvalidateMultiCheckAllocationQueries } from "./useMultiCheckAllocationQueries";
import type { MultiCheckAllocationCommandResultApiDto } from "./multiCheckAllocationApiTypes";

function outcomeToast(
  result: MultiCheckAllocationCommandResultApiDto,
  language: MultiCheckAllocationLang
) {
  if (result.outcome === "applied") {
    toast.success(multiCheckAllocationUiLabel("successApplied", language));
    return;
  }
  if (result.outcome === "already_applied") {
    toast.message(
      multiCheckAllocationUiLabel("successAlreadyApplied", language)
    );
    return;
  }
  toast.message(multiCheckAllocationUiLabel("successNoChange", language));
}

function mutationErrorToast(
  error: unknown,
  language: MultiCheckAllocationLang
) {
  const kind = mapMultiCheckAllocationApiError(error);
  toast.error(
    multiCheckAllocationErrorMessage(kind, language, { mutation: true })
  );
}

export function useMultiCheckAllocationMutations(
  language: MultiCheckAllocationLang
) {
  const invalidate = useInvalidateMultiCheckAllocationQueries();

  const onSuccess = async (
    result: MultiCheckAllocationCommandResultApiDto
  ) => {
    await invalidate();
    outcomeToast(result, language);
  };

  const onError = (error: unknown) => mutationErrorToast(error, language);

  const createAllocation =
    trpc.multiCheckAllocation.createAllocation.useMutation({
      onSuccess,
      onError,
    });
  const reserveAllocation =
    trpc.multiCheckAllocation.reserveAllocation.useMutation({
      onSuccess,
      onError,
    });
  const applyAllocation =
    trpc.multiCheckAllocation.applyAllocation.useMutation({
      onSuccess,
      onError,
    });
  const adjustAllocation =
    trpc.multiCheckAllocation.adjustAllocation.useMutation({
      onSuccess,
      onError,
    });
  const reverseAllocation =
    trpc.multiCheckAllocation.reverseAllocation.useMutation({
      onSuccess,
      onError,
    });
  const completeAllocation =
    trpc.multiCheckAllocation.completeAllocation.useMutation({
      onSuccess,
      onError,
    });
  const cancelAllocation =
    trpc.multiCheckAllocation.cancelAllocation.useMutation({
      onSuccess,
      onError,
    });

  const pending =
    createAllocation.isPending ||
    reserveAllocation.isPending ||
    applyAllocation.isPending ||
    adjustAllocation.isPending ||
    reverseAllocation.isPending ||
    completeAllocation.isPending ||
    cancelAllocation.isPending;

  return {
    createAllocation,
    reserveAllocation,
    applyAllocation,
    adjustAllocation,
    reverseAllocation,
    completeAllocation,
    cancelAllocation,
    pending,
  };
}
