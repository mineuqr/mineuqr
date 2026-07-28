/**
 * ORDER-STATE-PROPAGATION-REMEDIATION-1
 * React Query structuralSharing hooks for order lifecycle reads.
 */
import {
  mergeActiveOrderListCache,
  mergeKitchenQueueCache,
  type ActiveOrderListLike,
  type KitchenQueueLike,
} from "@shared/read-freshness";
import { noteReadFreshnessDecision } from "./noteReadFreshnessDecision";

export function activeOrderListStructuralSharing<T extends ActiveOrderListLike>(
  oldData: T | undefined,
  newData: T
): T {
  return mergeActiveOrderListCache(oldData, newData, (observation) =>
    noteReadFreshnessDecision(observation, "order.read.listActive")
  );
}

export function kitchenQueueStructuralSharing<T extends KitchenQueueLike>(
  oldData: T | undefined,
  newData: T
): T {
  return mergeKitchenQueueCache(oldData, newData, (observation) =>
    noteReadFreshnessDecision(observation, "kitchen.queue")
  );
}
