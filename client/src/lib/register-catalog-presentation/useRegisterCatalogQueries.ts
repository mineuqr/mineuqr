/**
 * REGISTER-CATALOG-MANAGEMENT-1 — thin query hooks over crmp.catalog.*
 */

import { trpc } from "@/lib/trpc";

export function useRegisterCatalogList(restaurantId: number) {
  return trpc.crmp.catalog.list.useQuery(
    { restaurantId },
    { enabled: restaurantId > 0 }
  );
}

export function useRegisterCatalogSearch(
  restaurantId: number,
  input: {
    query?: string;
    catalogStatus?: "provisioned" | "active" | "inactive";
    includeArchived?: boolean;
  }
) {
  return trpc.crmp.catalog.search.useQuery(
    {
      restaurantId,
      query: input.query,
      catalogStatus: input.catalogStatus,
      includeArchived: input.includeArchived,
    },
    { enabled: restaurantId > 0 }
  );
}
