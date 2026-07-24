/**
 * REGISTER-CATALOG-MANAGEMENT-1 — thin mutation hooks over crmp.catalog.*
 */

import { trpc } from "@/lib/trpc";

export function useRegisterCatalogMutations(restaurantId: number) {
  const utils = trpc.useUtils();
  const invalidate = () => {
    void utils.crmp.catalog.list.invalidate({ restaurantId });
    void utils.crmp.catalog.search.invalidate();
    void utils.crmp.register.listAvailable.invalidate({ restaurantId });
  };

  const create = trpc.crmp.catalog.create.useMutation({
    onSuccess: invalidate,
  });
  const update = trpc.crmp.catalog.update.useMutation({
    onSuccess: invalidate,
  });
  const activate = trpc.crmp.catalog.activate.useMutation({
    onSuccess: invalidate,
  });
  const deactivate = trpc.crmp.catalog.deactivate.useMutation({
    onSuccess: invalidate,
  });
  const archive = trpc.crmp.catalog.archive.useMutation({
    onSuccess: invalidate,
  });

  return { create, update, activate, deactivate, archive };
}
