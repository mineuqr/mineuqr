import { trpc } from "@/lib/trpc";
import {
  asQrMenuList,
  deriveQrOrderingRuntimeGates,
} from "@/lib/ordering-platform/qrOrderingRuntimeConsumer";

/**
 * QR-ORDERING-RUNTIME-MIGRATION-1 — QR consumes OrderingRuntimeContext via platform API.
 * No local hours/guest assembly; session/journey remain channel concerns.
 */
export function useQrOrderingRuntime(slug: string) {
  const query = trpc.ordering.getRuntimeBySlug.useQuery(
    { slug },
    { enabled: !!slug, staleTime: 0, gcTime: 0, refetchOnMount: "always" }
  );

  const runtime = query.data?.runtime ?? null;
  const restaurant = query.data?.restaurantPresentation ?? null;
  const gates = deriveQrOrderingRuntimeGates(runtime);

  return {
    ...query,
    runtime,
    restaurant,
    gates,
    categories: asQrMenuList<any>(runtime?.menu.categories),
    items: asQrMenuList<any>(runtime?.menu.products),
    offers: asQrMenuList<any>(runtime?.menu.offers),
    holidays: asQrMenuList<any>(runtime?.menu.availability),
  };
}
