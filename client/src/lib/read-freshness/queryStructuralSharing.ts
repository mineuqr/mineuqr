/**
 * ORDER-STATE-PROPAGATION-REMEDIATION-1
 * React Query structuralSharing hooks for order lifecycle reads.
 */
import {
  mergeActiveOrderListCache,
  mergeKitchenQueueCache,
  isActiveOrderListLike,
  isKitchenQueueLike,
} from "@shared/read-freshness";
import { noteReadFreshnessDecision } from "./noteReadFreshnessDecision";

export function activeOrderListStructuralSharing(
  oldData: unknown,
  newData: unknown
): unknown {
  if (!isActiveOrderListLike(newData)) return newData;
  const existing = isActiveOrderListLike(oldData) ? oldData : undefined;
  return mergeActiveOrderListCache(existing, newData, (observation) =>
    noteReadFreshnessDecision(observation, "order.read.listActive")
  );
}

export function kitchenQueueStructuralSharing(
  oldData: unknown,
  newData: unknown
): unknown {
  if (!isKitchenQueueLike(newData)) return newData;
  const existing = isKitchenQueueLike(oldData) ? oldData : undefined;
  return mergeKitchenQueueCache(existing, newData, (observation) =>
    noteReadFreshnessDecision(observation, "kitchen.queue")
  );
}
