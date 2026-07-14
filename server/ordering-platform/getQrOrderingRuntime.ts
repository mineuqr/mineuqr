import type { OrderingRuntimeContext } from "@shared/ordering-platform/orderingRuntimeContract";
import {
  orderingRuntimeMaterializer,
  type OrderingRuntimeMaterializer,
} from "./OrderingRuntimeMaterializer";
import {
  loadQrOrderingRuntimeSources,
  QrOrderingRuntimeLoadError,
  type QrOrderingRuntimeRestaurantRow,
} from "./loadQrOrderingRuntimeSources";

/**
 * QR-ORDERING-RUNTIME-MIGRATION-1 — QR runtime delivery service.
 *
 * Load (repos) → Materialize (platform) → Return immutable runtime + presentation sidecar.
 * Clients consume; they never compose.
 */

export type QrOrderingRuntimeResponse = {
  runtime: OrderingRuntimeContext;
  /**
   * Display-only restaurant record for QR templates.
   * Ordering gates must be read from `runtime`, never recomputed from this row.
   */
  restaurantPresentation: QrOrderingRuntimeRestaurantRow;
};

export async function getQrOrderingRuntimeBySlug(
  slug: string,
  deps: {
    materializer?: OrderingRuntimeMaterializer;
    now?: Date;
  } = {}
): Promise<QrOrderingRuntimeResponse> {
  const materializer = deps.materializer ?? orderingRuntimeMaterializer;
  const loaded = await loadQrOrderingRuntimeSources({ slug, now: deps.now });
  const runtime = materializer.materialize(loaded.request);
  return {
    runtime,
    restaurantPresentation: loaded.restaurantPresentation,
  };
}

export { QrOrderingRuntimeLoadError };
