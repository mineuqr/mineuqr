/**
 * DELIVERY-HARDENING-1 — READY push delivery stage tracing + observability.
 */

export const PUSH_DELIVERY_TRACE_BUILD = "DELIVERY-HARDENING-1";

export type PushDeliveryTraceStage =
  | "delivery_started"
  | "subscriptions_loaded"
  | "claim_attempt"
  | "claim_acquired"
  | "claim_failed"
  | "duplicate_send_prevented"
  | "send_started"
  | "send_success"
  | "send_failed"
  | "last_used_updated"
  | "stale_subscription_removed"
  | "ready_push_marked"
  | "ready_push_released"
  | "delivery_complete";

export type PushDeliveryFailureReason =
  | "no_tracking_token"
  | "no_vapid"
  | "no_push_context"
  | "no_subscriptions"
  | "subscriptions_all_expired"
  | "claim_failed"
  | "endpoint_gone"
  | "endpoint_invalid"
  | "send_rejected"
  | "all_subscriptions_failed";

export type PushDeliveryDiagnostics = {
  build: string;
  orderId: number;
  trackingToken: string | null;
  subscriptionCount: number;
  expiredSubscriptionCount: number;
  successfulSends: number;
  failedSends: number;
  successCount: number;
  failureCount: number;
  readyPushSentAt: string | null;
  lastUsedAt: string | null;
  claimResult: boolean | null;
  failureReason: PushDeliveryFailureReason | null;
  staleSubscriptionsRemoved: number;
  duplicateSendPrevented: boolean;
  stages: PushDeliveryTraceStage[];
  lastStage: PushDeliveryTraceStage | null;
  deliveryTimeline: string;
};

export function formatDeliveryTimeline(stages: PushDeliveryTraceStage[]): string {
  return stages.join(" → ");
}

export class PushDeliveryTrace {
  private readonly orderId: number;
  private trackingToken: string | null = null;
  private subscriptionCount = 0;
  private expiredSubscriptionCount = 0;
  private successfulSends = 0;
  private failedSends = 0;
  private readyPushSentAt: string | null = null;
  private lastUsedAt: string | null = null;
  private claimResult: boolean | null = null;
  private failureReason: PushDeliveryFailureReason | null = null;
  private staleSubscriptionsRemoved = 0;
  private duplicateSendPrevented = false;
  private stages: PushDeliveryTraceStage[] = [];
  private lastStage: PushDeliveryTraceStage | null = null;

  constructor(orderId: number, trackingToken?: string | null) {
    this.orderId = orderId;
    this.trackingToken = trackingToken ?? null;
    this.recordStage("delivery_started");
  }

  setTrackingToken(trackingToken: string): void {
    this.trackingToken = trackingToken;
  }

  recordStage(stage: PushDeliveryTraceStage, patch?: Partial<PushDeliveryDiagnostics>): void {
    this.stages.push(stage);
    this.lastStage = stage;
    if (patch?.subscriptionCount !== undefined) {
      this.subscriptionCount = patch.subscriptionCount;
    }
    if (patch?.expiredSubscriptionCount !== undefined) {
      this.expiredSubscriptionCount = patch.expiredSubscriptionCount;
    }
    if (patch?.successfulSends !== undefined) {
      this.successfulSends = patch.successfulSends;
    }
    if (patch?.failedSends !== undefined) {
      this.failedSends = patch.failedSends;
    }
    if (patch?.readyPushSentAt !== undefined) {
      this.readyPushSentAt = patch.readyPushSentAt;
    }
    if (patch?.lastUsedAt !== undefined) {
      this.lastUsedAt = patch.lastUsedAt;
    }
    if (patch?.claimResult !== undefined) {
      this.claimResult = patch.claimResult;
    }
    if (patch?.staleSubscriptionsRemoved !== undefined) {
      this.staleSubscriptionsRemoved = patch.staleSubscriptionsRemoved;
    }
  }

  setSubscriptionsLoaded(count: number, expiredCount = 0): void {
    this.subscriptionCount = count;
    this.expiredSubscriptionCount = expiredCount;
    this.recordStage("subscriptions_loaded", {
      subscriptionCount: count,
      expiredSubscriptionCount: expiredCount,
    });
  }

  setFailure(reason: PushDeliveryFailureReason): void {
    this.failureReason = reason;
  }

  markClaimAttempt(): void {
    this.recordStage("claim_attempt");
  }

  markClaimAcquired(readyPushSentAt: string): void {
    this.claimResult = true;
    this.readyPushSentAt = readyPushSentAt;
    this.recordStage("claim_acquired", { claimResult: true, readyPushSentAt });
    this.recordStage("ready_push_marked", { readyPushSentAt });
  }

  markClaimFailedDuplicate(): void {
    this.claimResult = false;
    this.duplicateSendPrevented = true;
    this.setFailure("claim_failed");
    this.recordStage("claim_failed", { claimResult: false });
    this.recordStage("duplicate_send_prevented");
  }

  markSendStarted(): void {
    this.recordStage("send_started");
  }

  markSendSuccess(lastUsedAt: string): void {
    this.successfulSends += 1;
    this.lastUsedAt = lastUsedAt;
    this.recordStage("send_success", { successfulSends: this.successfulSends, lastUsedAt });
    this.recordStage("last_used_updated", { lastUsedAt });
  }

  markSendFailed(_reason: PushDeliveryFailureReason): void {
    this.failedSends += 1;
    this.recordStage("send_failed", { failedSends: this.failedSends });
  }

  markStaleSubscriptionRemoved(): void {
    this.staleSubscriptionsRemoved += 1;
    this.recordStage("stale_subscription_removed", {
      staleSubscriptionsRemoved: this.staleSubscriptionsRemoved,
    });
  }

  markReadyPushReleased(): void {
    this.readyPushSentAt = null;
    this.recordStage("ready_push_released", { readyPushSentAt: null });
  }

  markDeliveryComplete(): void {
    this.recordStage("delivery_complete", {
      successfulSends: this.successfulSends,
      failedSends: this.failedSends,
    });
  }

  getDiagnostics(): PushDeliveryDiagnostics {
    return {
      build: PUSH_DELIVERY_TRACE_BUILD,
      orderId: this.orderId,
      trackingToken: this.trackingToken,
      subscriptionCount: this.subscriptionCount,
      expiredSubscriptionCount: this.expiredSubscriptionCount,
      successfulSends: this.successfulSends,
      failedSends: this.failedSends,
      successCount: this.successfulSends,
      failureCount: this.failedSends,
      readyPushSentAt: this.readyPushSentAt,
      lastUsedAt: this.lastUsedAt,
      claimResult: this.claimResult,
      failureReason: this.failureReason,
      staleSubscriptionsRemoved: this.staleSubscriptionsRemoved,
      duplicateSendPrevented: this.duplicateSendPrevented,
      stages: [...this.stages],
      lastStage: this.lastStage,
      deliveryTimeline: formatDeliveryTimeline(this.stages),
    };
  }
}

export function classifySendFailure(statusCode: number | undefined): PushDeliveryFailureReason {
  if (statusCode === 404 || statusCode === 410) {
    return "endpoint_gone";
  }
  if (statusCode === 400 || statusCode === 413) {
    return "endpoint_invalid";
  }
  return "send_rejected";
}
