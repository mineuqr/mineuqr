/**
 * PUSH-DELIVERY-VALIDATION-1 — READY push delivery stage tracing.
 */

export const PUSH_DELIVERY_TRACE_BUILD = "PUSH-DELIVERY-VALIDATION-1";

export type PushDeliveryTraceStage =
  | "delivery_started"
  | "subscriptions_loaded"
  | "claim_attempt"
  | "claim_acquired"
  | "claim_failed"
  | "send_started"
  | "send_success"
  | "send_failed"
  | "last_used_updated"
  | "ready_push_marked"
  | "ready_push_released"
  | "delivery_complete";

export type PushDeliveryFailureReason =
  | "no_tracking_token"
  | "no_vapid"
  | "no_push_context"
  | "no_subscriptions"
  | "claim_failed"
  | "endpoint_gone"
  | "endpoint_invalid"
  | "send_rejected"
  | "all_subscriptions_failed";

export type PushDeliveryDiagnostics = {
  build: string;
  orderId: number;
  subscriptionCount: number;
  successfulSends: number;
  failedSends: number;
  readyPushSentAt: string | null;
  claimResult: boolean | null;
  failureReason: PushDeliveryFailureReason | null;
  stages: PushDeliveryTraceStage[];
  lastStage: PushDeliveryTraceStage | null;
};

export class PushDeliveryTrace {
  private readonly orderId: number;
  private subscriptionCount = 0;
  private successfulSends = 0;
  private failedSends = 0;
  private readyPushSentAt: string | null = null;
  private claimResult: boolean | null = null;
  private failureReason: PushDeliveryFailureReason | null = null;
  private stages: PushDeliveryTraceStage[] = [];
  private lastStage: PushDeliveryTraceStage | null = null;

  constructor(orderId: number) {
    this.orderId = orderId;
    this.recordStage("delivery_started");
  }

  recordStage(stage: PushDeliveryTraceStage, patch?: Partial<PushDeliveryDiagnostics>): void {
    this.stages.push(stage);
    this.lastStage = stage;
    if (patch?.subscriptionCount !== undefined) {
      this.subscriptionCount = patch.subscriptionCount;
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
    if (patch?.claimResult !== undefined) {
      this.claimResult = patch.claimResult;
    }
  }

  setSubscriptionsLoaded(count: number): void {
    this.subscriptionCount = count;
    this.recordStage("subscriptions_loaded", { subscriptionCount: count });
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

  markClaimFailed(): void {
    this.claimResult = false;
    this.setFailure("claim_failed");
    this.recordStage("claim_failed", { claimResult: false });
  }

  markSendStarted(): void {
    this.recordStage("send_started");
  }

  markSendSuccess(): void {
    this.successfulSends += 1;
    this.recordStage("send_success", { successfulSends: this.successfulSends });
    this.recordStage("last_used_updated");
  }

  markSendFailed(_reason: PushDeliveryFailureReason): void {
    this.failedSends += 1;
    this.recordStage("send_failed", { failedSends: this.failedSends });
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
      subscriptionCount: this.subscriptionCount,
      successfulSends: this.successfulSends,
      failedSends: this.failedSends,
      readyPushSentAt: this.readyPushSentAt,
      claimResult: this.claimResult,
      failureReason: this.failureReason,
      stages: [...this.stages],
      lastStage: this.lastStage,
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
