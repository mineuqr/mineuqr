/**
 * ORDERING-CLIENT-RUNTIME-1 — sole Client Platform consumer of Ordering Runtime delivery.
 * Channels must not call ordering.getRuntimeBySlug outside this module.
 */
import { trpc } from "@/lib/trpc";
import {
  asOrderingMenuList,
  deriveOrderingRuntimeGates,
} from "./orderingRuntimeGates";

export type OrderingClientRuntimeStatus =
  | "idle"
  | "loading"
  | "ready"
  | "error";

/**
 * Shared runtime entry for every ordering channel.
 * Consumes OrderingRuntimeContext only — never constructs it.
 */
export function useOrderingRuntime(slug: string) {
  const query = trpc.ordering.getRuntimeBySlug.useQuery(
    { slug },
    { enabled: !!slug, staleTime: 0, gcTime: 0, refetchOnMount: "always" }
  );

  const runtime = query.data?.runtime ?? null;
  const restaurant = query.data?.restaurantPresentation ?? null;
  const gates = deriveOrderingRuntimeGates(runtime);

  let status: OrderingClientRuntimeStatus = "idle";
  if (!slug) status = "idle";
  else if (query.isLoading) status = "loading";
  else if (query.isError) status = "error";
  else if (runtime) status = "ready";
  else status = "loading";

  return {
    ...query,
    runtime,
    restaurant,
    gates,
    status,
    categories: asOrderingMenuList<any>(runtime?.menu.categories),
    items: asOrderingMenuList<any>(runtime?.menu.products),
    offers: asOrderingMenuList<any>(runtime?.menu.offers),
    holidays: asOrderingMenuList<any>(runtime?.menu.availability),
  };
}
