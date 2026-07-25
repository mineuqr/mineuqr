/**
 * FINANCIAL-SHIFT-WORKFLOW-ADOPTION-1 /
 * FINANCIAL-SHIFT-RETENTION-ADOPTION-1 — mutations/queries over crmp.financialShift.*.
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
    archive: trpc.crmp.financialShift.archive.useMutation({
      onSuccess: async () => {
        await utils.crmp.financialShift.listArchive.invalidate();
        toast.success(
          registerOperationsUiLabel("shiftArchiveSuccess", language)
        );
      },
      onError,
    }),
  };
}

export function useFinancialShiftArchive(
  input: {
    restaurantId: number;
    preset?: "today" | "last_7" | "last_30" | "last_90" | "custom" | "all";
    customFromIso?: string;
    customToIso?: string;
    registerId?: string;
    shiftNumber?: number;
    operatorUserId?: number;
    financialShiftIdQuery?: string;
    limit?: number;
    offset?: number;
  },
  options: { enabled?: boolean } = {}
) {
  return trpc.crmp.financialShift.listArchive.useQuery(input, {
    enabled: (options.enabled ?? true) && input.restaurantId > 0,
    staleTime: 5_000,
  });
}

export function useFinancialShiftClosingReport(
  input: { restaurantId: number; financialShiftId: string },
  options: { enabled?: boolean } = {}
) {
  return trpc.crmp.financialShift.getClosingReport.useQuery(input, {
    enabled:
      (options.enabled ?? true) &&
      input.restaurantId > 0 &&
      input.financialShiftId.length > 0,
  });
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
