import { useMemo, useRef } from "react";
import type { OrderPresentationModel } from "./orderPresentationModel";
import { reconcileOrderPresentationList } from "./reconcileOrderPresentation";
import { recordOrderPerfEvent } from "./orderPresentationInstrumentation";

/**
 * ORDER-INTERACTION-PERFORMANCE-1 — maps a list of read-model sources into
 * stable OrderPresentationModel references.
 *
 * Unchanged orders retain their previous presentation reference across renders,
 * so memoized cards skip re-rendering when a single order changes. `mapSource`
 * and `getKey` must be stable (wrap with useCallback) so mapping only re-runs
 * when `sources` changes.
 */
export function useOrderPresentations<TSource>(
  sources: readonly TSource[],
  mapSource: (source: TSource) => OrderPresentationModel,
  getKey: (source: TSource) => string
): OrderPresentationModel[] {
  const previousRef = useRef<Map<string, OrderPresentationModel>>(new Map());

  return useMemo(() => {
    const result = reconcileOrderPresentationList(
      previousRef.current,
      sources,
      mapSource,
      getKey
    );
    previousRef.current = result.nextByKey;

    recordOrderPerfEvent("presentation:mapped", result.mapped);
    recordOrderPerfEvent("presentation:reused", result.reused);
    if (result.workspaceChanged) {
      recordOrderPerfEvent("workspace:updated");
    }

    return result.presentations;
  }, [sources, mapSource, getKey]);
}
