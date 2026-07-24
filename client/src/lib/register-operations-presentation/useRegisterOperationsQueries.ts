/**
 * REGISTER-OPERATIONS-UI-1 — tRPC query hooks over crmp.register.* only.
 */

import { trpc } from "@/lib/trpc";

type Enabled = { enabled?: boolean };

export function useRegisterList(
  input: { restaurantId: number },
  options: Enabled = {}
) {
  return trpc.crmp.register.listAvailable.useQuery(input, {
    enabled: (options.enabled ?? true) && input.restaurantId > 0,
    staleTime: 5_000,
    refetchOnWindowFocus: true,
  });
}

export function useRegisterCurrent(
  input: { restaurantId: number; registerId: string },
  options: Enabled = {}
) {
  return trpc.crmp.register.getCurrent.useQuery(input, {
    enabled:
      (options.enabled ?? true) &&
      input.restaurantId > 0 &&
      input.registerId.length > 0,
    staleTime: 3_000,
    refetchInterval: 15_000,
  });
}

export function useRegisterHistory(
  input: { restaurantId: number; registerId: string },
  options: Enabled = {}
) {
  return trpc.crmp.register.getHistory.useQuery(input, {
    enabled:
      (options.enabled ?? true) &&
      input.restaurantId > 0 &&
      input.registerId.length > 0,
    staleTime: 10_000,
  });
}

export function useInvalidateRegisterOperationsQueries() {
  const utils = trpc.useUtils();
  return async (restaurantId: number, registerId?: string) => {
    await Promise.all([
      utils.crmp.register.listAvailable.invalidate({ restaurantId }),
      utils.crmp.register.get.invalidate(),
      utils.crmp.register.getCurrent.invalidate(),
      utils.crmp.register.getDutyStatus.invalidate(),
      utils.crmp.register.getCurrentOperator.invalidate(),
      utils.crmp.register.getCurrentDevice.invalidate(),
      utils.crmp.register.getCurrentFinancialShift.invalidate(),
      utils.crmp.register.getHistory.invalidate(),
      utils.crmp.register.resolveActive.invalidate(),
      utils.crmp.register.resolveByDevice.invalidate(),
      utils.crmp.register.resolveByOperator.invalidate(),
      utils.crmp.financialShift.getCurrent.invalidate(),
      utils.crmp.financialShift.getTenderSummary.invalidate(),
      registerId
        ? utils.crmp.register.getCurrent.invalidate({
            restaurantId,
            registerId,
          })
        : Promise.resolve(),
      registerId
        ? utils.crmp.financialShift.getCurrent.invalidate({
            restaurantId,
            registerId,
          })
        : Promise.resolve(),
      registerId
        ? utils.crmp.financialShift.getTenderSummary.invalidate({
            restaurantId,
            registerId,
          })
        : Promise.resolve(),
    ]);
  };
}
