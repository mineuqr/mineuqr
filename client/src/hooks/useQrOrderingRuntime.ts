/**
 * QR-ORDERING-RUNTIME-MIGRATION-1 / ORDERING-CLIENT-RUNTIME-1 —
 * QR channel thin wrapper over Ordering Client Platform runtime.
 * Channels must not invoke the platform delivery query here.
 */
import {
  useOptionalOrderingClientRuntime,
  useOrderingRuntime,
  type OrderingClientRuntimeGates,
} from "@/lib/ordering-client";

export type QrOrderingRuntimeGates = OrderingClientRuntimeGates;

export function useQrOrderingRuntime(slug: string) {
  const hosted = useOptionalOrderingClientRuntime();
  const useHosted = Boolean(hosted && hosted.slug === slug);
  const standalone = useOrderingRuntime(useHosted ? "" : slug);

  if (useHosted && hosted) {
    return {
      data: hosted.runtime
        ? {
            runtime: hosted.runtime,
            restaurantPresentation: hosted.restaurant,
          }
        : undefined,
      runtime: hosted.runtime,
      restaurant: hosted.restaurant,
      gates: hosted.gates,
      categories: hosted.categories,
      items: hosted.items,
      offers: hosted.offers,
      holidays: hosted.holidays,
      isLoading: hosted.isLoading,
      isError: hosted.isError,
      error: hosted.error,
      status: hosted.status,
      refetch: hosted.refetch,
      isFetching: hosted.isLoading,
      isSuccess: hosted.status === "ready",
      isPending: hosted.isLoading,
    };
  }

  return standalone;
}
