import type { OrderPresentationModel } from "./orderPresentationModel";
import { structuralShare } from "./structuralShare";

/**
 * ORDER-INTERACTION-PERFORMANCE-1 — reconcile a freshly mapped presentation
 * against the previous one for the same order.
 *
 * Preserves the previous reference (and unchanged sub-sections: identity,
 * labels, badges, indicators, actions) when the presentation input has not
 * changed. Pure and deterministic — no caches, no mutation.
 */
export function reconcileOrderPresentation(
  previous: OrderPresentationModel | undefined,
  next: OrderPresentationModel
): OrderPresentationModel {
  if (!previous) return next;
  return structuralShare(previous, next);
}

export type PresentationReconcileResult = {
  presentations: OrderPresentationModel[];
  nextByKey: Map<string, OrderPresentationModel>;
  mapped: number;
  reused: number;
  workspaceChanged: boolean;
};

/**
 * Pure reconciliation of an ordered list of sources into stable presentation
 * models. Unchanged orders keep their previous reference; changed orders get a
 * freshly reconciled model. The React hook wraps this — the core is stateless
 * so it can be tested without a renderer.
 */
export function reconcileOrderPresentationList<TSource>(
  previous: Map<string, OrderPresentationModel>,
  sources: readonly TSource[],
  mapSource: (source: TSource) => OrderPresentationModel,
  getKey: (source: TSource) => string
): PresentationReconcileResult {
  const nextByKey = new Map<string, OrderPresentationModel>();
  let mapped = 0;
  let reused = 0;
  let workspaceChanged = previous.size !== sources.length;

  const presentations = sources.map((source) => {
    const key = getKey(source);
    const candidate = mapSource(source);
    mapped += 1;
    const prior = previous.get(key);
    const reconciled = reconcileOrderPresentation(prior, candidate);
    if (prior && reconciled === prior) {
      reused += 1;
    } else {
      workspaceChanged = true;
    }
    nextByKey.set(key, reconciled);
    return reconciled;
  });

  return { presentations, nextByKey, mapped, reused, workspaceChanged };
}
