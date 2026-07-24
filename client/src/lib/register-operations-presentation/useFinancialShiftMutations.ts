/**
 * FINANCIAL-SHIFT-WORKFLOW-ADOPTION-1 — mutations over crmp.financialShift.*.
 */

import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  mapRegisterOperationsApiError,
  registerOperationsErrorMessage,
} from "./registerOperationsErrorPresentation";
import {
  registerOperationsUiLabel,
  type RegisterOperationsLang,
} from "./registerOperationsCopy";
import { useInvalidateRegisterOperationsQueries } from "./useRegisterOperationsQueries";

export function useFinancialShiftMutations(
  restaurantId: number,
  language: RegisterOperationsLang
) {
  const invalidate = useInvalidateRegisterOperationsQueries();
  const utils = trpc.useUtils();

  const onError = (error: unknown) => {
    const kind = mapRegisterOperationsApiError(error);
    toast.error(registerOperationsErrorMessage(kind, language));
  };

  return {
    open: trpc.crmp.financialShift.open.useMutation({
      onSuccess: async (result) => {
        await invalidate(restaurantId, result.shift.registerId);
        await utils.crmp.financialShift.getCurrent.invalidate();
        toast.success(
          registerOperationsUiLabel("shiftOpenSuccess", language)
        );
      },
      onError,
    }),
    close: trpc.crmp.financialShift.close.useMutation({
      onSuccess: async (result) => {
        await invalidate(restaurantId, result.shift.registerId);
        await utils.crmp.financialShift.getCurrent.invalidate();
        toast.success(
          registerOperationsUiLabel("shiftCloseSuccess", language)
        );
      },
      onError,
    }),
  };
}

export function useFinancialShiftCurrent(
  input: { restaurantId: number; registerId: string },
  options: { enabled?: boolean } = {}
) {
  return trpc.crmp.financialShift.getCurrent.useQuery(input, {
    enabled:
      (options.enabled ?? true) &&
      input.restaurantId > 0 &&
      input.registerId.length > 0,
    staleTime: 3_000,
    refetchInterval: 15_000,
  });
}

export function useFinancialShiftTenderSummary(
  input: { restaurantId: number; registerId: string },
  options: { enabled?: boolean } = {}
) {
  return trpc.crmp.financialShift.getTenderSummary.useQuery(input, {
    enabled:
      (options.enabled ?? true) &&
      input.restaurantId > 0 &&
      input.registerId.length > 0,
    staleTime: 3_000,
    refetchInterval: 15_000,
  });
}
