/**
 * SUBSCRIPTION-RUNTIME-ENTITLEMENT-ENFORCEMENT-1
 * Process-local lifecycle signal overlay (Billing-ready; no Catalog reads).
 * Durable persistence is out of billing scope for this program.
 */

import type { LifecycleSignals } from "./lifecycleSync";

const overlays = new Map<number, LifecycleSignals>();

export function setLifecycleSignals(
  subscriptionId: number,
  signals: LifecycleSignals
): void {
  const prev = overlays.get(subscriptionId) ?? {};
  overlays.set(subscriptionId, { ...prev, ...signals });
}

export function clearLifecycleSignals(subscriptionId: number): void {
  overlays.delete(subscriptionId);
}

export function getLifecycleSignals(
  subscriptionId: number
): LifecycleSignals | null {
  return overlays.get(subscriptionId) ?? null;
}

export function clearAllLifecycleSignals(): void {
  overlays.clear();
}

/** Plan-change / admin helpers (I-CPL-13 companion signals). */
export function markGrandfathered(subscriptionId: number): void {
  setLifecycleSignals(subscriptionId, { grandfathered: true });
}

export function markSuspended(subscriptionId: number): void {
  setLifecycleSignals(subscriptionId, { suspended: true });
}

export function clearSuspended(subscriptionId: number): void {
  const prev = overlays.get(subscriptionId) ?? {};
  overlays.set(subscriptionId, { ...prev, suspended: false });
}

export function enterGrace(
  subscriptionId: number,
  graceUntil: string | Date
): void {
  setLifecycleSignals(subscriptionId, {
    graceUntil,
    suspended: false,
  });
}
