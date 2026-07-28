/**
 * ORDER-STATE-PROPAGATION-REMEDIATION-1
 * Write-confirmed status watermarks — protect cache until a fresher read arrives.
 */

import {
  normalizeOrderFreshnessStatus,
  orderStatusFreshnessRank,
  type OrderFreshnessStatus,
} from "./orderStatusRank";

export type ConfirmedOrderWrite = {
  orderId: number;
  status: OrderFreshnessStatus;
  confirmedAt: number;
};

const confirmedWrites = new Map<number, ConfirmedOrderWrite>();

export function confirmOrderStatusWrite(
  orderId: number,
  status: string,
  confirmedAt: number = Date.now()
): ConfirmedOrderWrite | null {
  const normalized = normalizeOrderFreshnessStatus(status);
  if (!normalized) return null;
  const next: ConfirmedOrderWrite = { orderId, status: normalized, confirmedAt };
  const prev = confirmedWrites.get(orderId);
  const prevRank = prev ? orderStatusFreshnessRank(prev.status) ?? 0 : 0;
  const nextRank = orderStatusFreshnessRank(normalized) ?? 0;
  if (!prev || nextRank >= prevRank) {
    confirmedWrites.set(orderId, next);
  }
  return confirmedWrites.get(orderId) ?? next;
}

export function clearOrderStatusWriteConfirmation(orderId: number): void {
  confirmedWrites.delete(orderId);
}

export function getOrderStatusWriteConfirmation(
  orderId: number
): ConfirmedOrderWrite | undefined {
  return confirmedWrites.get(orderId);
}

export function clearAllOrderStatusWriteConfirmations(): void {
  confirmedWrites.clear();
}

/**
 * True when an active write confirmation forbids replacing cache with incomingStatus.
 */
export function isStaleRelativeToConfirmedWrite(
  orderId: number,
  incomingStatus: string | null | undefined
): boolean {
  const confirmed = confirmedWrites.get(orderId);
  if (!confirmed) return false;
  const incomingRank = orderStatusFreshnessRank(incomingStatus);
  const confirmedRank = orderStatusFreshnessRank(confirmed.status);
  if (incomingRank == null || confirmedRank == null) return false;
  return incomingRank < confirmedRank;
}

/**
 * Drop confirmation once a read has caught up to (or passed) the confirmed status.
 */
export function releaseOrderStatusWriteConfirmationIfCaughtUp(
  orderId: number,
  readStatus: string | null | undefined
): void {
  const confirmed = confirmedWrites.get(orderId);
  if (!confirmed) return;
  const readRank = orderStatusFreshnessRank(readStatus);
  const confirmedRank = orderStatusFreshnessRank(confirmed.status);
  if (readRank == null || confirmedRank == null) return;
  if (readRank >= confirmedRank) {
    confirmedWrites.delete(orderId);
  }
}
