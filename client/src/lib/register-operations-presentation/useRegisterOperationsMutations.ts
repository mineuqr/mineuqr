/**
 * REGISTER-OPERATIONS-UI-1 — mutation hooks over crmp.register.* only.
 */

import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  extractTrpcMessage,
  mapRegisterOperationsApiError,
  registerOperationsErrorMessage,
} from "./registerOperationsErrorPresentation";
import {
  registerOperationsUiLabel,
  type RegisterOperationsLang,
} from "./registerOperationsCopy";
import { useInvalidateRegisterOperationsQueries } from "./useRegisterOperationsQueries";
import type { RegisterCommandResultDto } from "./registerOperationsApiTypes";

function mutationErrorToast(
  error: unknown,
  language: RegisterOperationsLang
) {
  const kind = mapRegisterOperationsApiError(error);
  toast.error(
    registerOperationsErrorMessage(kind, language, extractTrpcMessage(error))
  );
}

function successToast(
  result: RegisterCommandResultDto,
  language: RegisterOperationsLang
) {
  if (result.alreadyApplied) {
    toast.message(registerOperationsUiLabel("alreadyApplied", language));
    return;
  }
  toast.success(registerOperationsUiLabel("success", language));
}

export function useRegisterOperationsMutations(
  restaurantId: number,
  language: RegisterOperationsLang
) {
  const invalidate = useInvalidateRegisterOperationsQueries();

  const onSuccess = async (result: RegisterCommandResultDto) => {
    await invalidate(restaurantId, result.register.registerId);
    successToast(result, language);
  };

  const onError = (error: unknown) => mutationErrorToast(error, language);

  return {
    open: trpc.crmp.register.open.useMutation({ onSuccess, onError }),
    close: trpc.crmp.register.close.useMutation({ onSuccess, onError }),
    suspend: trpc.crmp.register.suspend.useMutation({ onSuccess, onError }),
    resume: trpc.crmp.register.resume.useMutation({ onSuccess, onError }),
    assignOperator: trpc.crmp.register.assignOperator.useMutation({
      onSuccess,
      onError,
    }),
    releaseOperator: trpc.crmp.register.releaseOperator.useMutation({
      onSuccess,
      onError,
    }),
    reassignOperator: trpc.crmp.register.reassignOperator.useMutation({
      onSuccess,
      onError,
    }),
    attachDevice: trpc.crmp.register.attachDevice.useMutation({
      onSuccess,
      onError,
    }),
    detachDevice: trpc.crmp.register.detachDevice.useMutation({
      onSuccess,
      onError,
    }),
    replaceDevice: trpc.crmp.register.replaceDevice.useMutation({
      onSuccess,
      onError,
    }),
  };
}

/** Resolve is a query on the API — expose as imperative fetch via utils. */
export function useResolveActiveRegister(language: RegisterOperationsLang) {
  const utils = trpc.useUtils();
  const invalidate = useInvalidateRegisterOperationsQueries();

  return {
    resolve: async (input: {
      restaurantId: number;
      registerId?: string | null;
    }) => {
      try {
        const register = await utils.crmp.register.resolveActive.fetch(input);
        await invalidate(input.restaurantId, register.registerId);
        toast.success(registerOperationsUiLabel("success", language));
        return register;
      } catch (error) {
        mutationErrorToast(error, language);
        throw error;
      }
    },
  };
}
