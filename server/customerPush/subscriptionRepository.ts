/**
 * BACKGROUND-NOTIFICATIONS-1A — customer push subscription persistence.
 */

import {
  claimReadyPushSend,
  countExpiredPushSubscriptionsForOrder,
  deletePushSubscriptionByEndpointHash,
  deletePushSubscriptionsForOrder,
  getActivePushSubscriptionsForOrder,
  releaseReadyPushSend,
  touchCustomerPushSubscriptionLastUsed,
  upsertCustomerPushSubscription,
  type CustomerPushSubscriptionRow,
} from "../db";
import { hashPushEndpoint } from "./endpointHash";

export type PushSubscriptionInput = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

export { type CustomerPushSubscriptionRow };

export async function upsertPushSubscription(options: {
  orderId: number;
  trackingToken: string;
  subscription: PushSubscriptionInput;
}): Promise<{ id: number }> {
  const endpointHash = hashPushEndpoint(options.subscription.endpoint);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");

  return upsertCustomerPushSubscription({
    orderId: options.orderId,
    trackingToken: options.trackingToken,
    endpoint: options.subscription.endpoint,
    endpointHash,
    p256dh: options.subscription.keys.p256dh,
    auth: options.subscription.keys.auth,
    expiresAt,
  });
}

export async function removePushSubscription(options: {
  orderId: number;
  endpoint: string;
}): Promise<void> {
  await deletePushSubscriptionByEndpointHash(
    options.orderId,
    hashPushEndpoint(options.endpoint)
  );
}

export async function listActiveSubscriptionsForOrder(
  orderId: number
): Promise<CustomerPushSubscriptionRow[]> {
  return getActivePushSubscriptionsForOrder(orderId);
}

export async function countExpiredSubscriptionsForOrder(orderId: number): Promise<number> {
  return countExpiredPushSubscriptionsForOrder(orderId);
}

export async function removeAllPushSubscriptionsForOrder(orderId: number): Promise<void> {
  await deletePushSubscriptionsForOrder(orderId);
}

export async function claimReadyPushForOrder(orderId: number): Promise<boolean> {
  return claimReadyPushSend(orderId);
}

export async function releaseReadyPushForOrder(orderId: number): Promise<void> {
  return releaseReadyPushSend(orderId);
}

export async function removeStalePushSubscription(
  orderId: number,
  endpoint: string
): Promise<void> {
  await deletePushSubscriptionByEndpointHash(orderId, hashPushEndpoint(endpoint));
}

export async function touchPushSubscriptionLastUsed(subscriptionId: number): Promise<string | null> {
  return touchCustomerPushSubscriptionLastUsed(subscriptionId);
}
