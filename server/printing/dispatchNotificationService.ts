/**
 * THERMAL-PRINTING-13I.3C.2 — dispatch notification delivery (WebSocket + persistence).
 */
import { opsLog } from "../_core/opsLog";
import { OPS_EVENT } from "../_core/opsTaxonomy";
import { notifyAgentOfJobId } from "./assignmentNotifier";
import {
  hasPersistedDispatchNotification,
  recordPersistedDispatchNotification,
  type PendingDispatchNotification,
} from "./dispatchNotificationRepository";

export type AttemptDispatchNotificationInput = {
  jobId: number;
  agentId: string;
  assignedAt: string;
  restaurantId?: number;
  correlationId?: string;
  replayReason?: string;
};

export type AttemptDispatchNotificationResult =
  | { notified: true; duplicate: false }
  | { notified: true; duplicate: true }
  | { notified: false; reason: "agent_disconnected" };

function resolveNotificationTimestamp(assignedAt: string): string {
  const trimmed = assignedAt.trim();
  if (!trimmed) {
    return new Date().toISOString();
  }
  return trimmed;
}

export async function attemptDispatchNotification(
  input: AttemptDispatchNotificationInput
): Promise<AttemptDispatchNotificationResult> {
  if (await hasPersistedDispatchNotification(input.jobId)) {
    return { notified: true, duplicate: true };
  }

  const notification = notifyAgentOfJobId({
    agentId: input.agentId,
    jobId: input.jobId,
    timestamp: resolveNotificationTimestamp(input.assignedAt),
  });

  if (!notification.notified) {
    return { notified: false, reason: notification.reason ?? "agent_disconnected" };
  }

  await recordPersistedDispatchNotification(input.jobId);

  opsLog({
    type: OPS_EVENT.dispatch_notification_sent,
    category: "ORDER",
    severity: "info",
    ts: new Date().toISOString(),
    correlationId: input.correlationId,
    restaurantId: input.restaurantId,
    metadata: {
      jobId: input.jobId,
      agentId: input.agentId,
      correlationId: input.correlationId,
      replay: Boolean(input.replayReason),
      replayReason: input.replayReason,
    },
  });

  opsLog({
    type: OPS_EVENT.print_agent_job_notified,
    category: "ORDER",
    severity: "info",
    ts: new Date().toISOString(),
    correlationId: input.correlationId,
    restaurantId: input.restaurantId,
    metadata: {
      printJobId: input.jobId,
      agentId: input.agentId,
      correlationId: input.correlationId,
    },
  });

  return { notified: true, duplicate: false };
}

export async function attemptPendingDispatchNotification(
  pending: PendingDispatchNotification,
  input?: { correlationId?: string; replayReason?: string }
): Promise<AttemptDispatchNotificationResult> {
  const result = await attemptDispatchNotification({
    jobId: pending.jobId,
    agentId: pending.agentId,
    assignedAt: pending.assignedAt,
    restaurantId: pending.restaurantId,
    correlationId: input?.correlationId,
    replayReason: input?.replayReason,
  });

  if (!result.notified && result.reason) {
    opsLog({
      type: OPS_EVENT.dispatch_notification_failed,
      category: "ORDER",
      severity: "info",
      ts: new Date().toISOString(),
      correlationId: input?.correlationId,
      restaurantId: pending.restaurantId,
      metadata: {
        jobId: pending.jobId,
        agentId: pending.agentId,
        reason: result.reason,
        replayReason: input?.replayReason,
        correlationId: input?.correlationId,
      },
    });
  }

  return result;
}
