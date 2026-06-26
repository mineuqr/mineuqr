/**
 * THERMAL-PRINTING-13I.3C.2 — reconnect replay, restart recovery, notify retry.
 */
import { warmPrintJobAssignmentCache } from "./assignmentService";
import {
  listPendingDispatchNotifications,
  type PendingDispatchNotification,
} from "./dispatchNotificationRepository";
import { attemptPendingDispatchNotification } from "./dispatchNotificationService";

export const DEFAULT_DISPATCH_RETRY_INTERVAL_MS = 15_000;

let retryTimer: ReturnType<typeof setInterval> | null = null;
let retryInFlight = false;

export type DispatchReplayResult = {
  attempted: number;
  notified: number;
  skippedOffline: number;
  duplicates: number;
};

async function replayPendingNotifications(
  pending: PendingDispatchNotification[],
  replayReason: string
): Promise<DispatchReplayResult> {
  const result: DispatchReplayResult = {
    attempted: 0,
    notified: 0,
    skippedOffline: 0,
    duplicates: 0,
  };

  for (const job of pending) {
    warmPrintJobAssignmentCache({
      jobId: job.jobId,
      agentId: job.agentId,
      restaurantId: job.restaurantId,
      orderId: job.orderId,
      printerId: job.printerId,
      assignedAt: job.assignedAt,
    });
    result.attempted += 1;
    const attempt = await attemptPendingDispatchNotification(job, { replayReason });
    if (attempt.notified && attempt.duplicate) {
      result.duplicates += 1;
    } else if (attempt.notified) {
      result.notified += 1;
    } else {
      result.skippedOffline += 1;
    }
  }

  return result;
}

export async function replayPendingDispatchNotificationsForAgent(
  agentId: string
): Promise<DispatchReplayResult> {
  const pending = await listPendingDispatchNotifications(agentId);
  return replayPendingNotifications(pending, "agent_reconnect");
}

export async function replayAllPendingDispatchNotifications(): Promise<DispatchReplayResult> {
  const pending = await listPendingDispatchNotifications();
  return replayPendingNotifications(pending, "print_host_restart");
}

export async function runDispatchRetrySweep(): Promise<DispatchReplayResult> {
  if (retryInFlight) {
    return { attempted: 0, notified: 0, skippedOffline: 0, duplicates: 0 };
  }

  retryInFlight = true;
  try {
    const pending = await listPendingDispatchNotifications();
    return replayPendingNotifications(pending, "notify_retry");
  } finally {
    retryInFlight = false;
  }
}

export function startDispatchRetryScheduler(
  intervalMs: number = DEFAULT_DISPATCH_RETRY_INTERVAL_MS
): void {
  if (retryTimer) {
    return;
  }

  retryTimer = setInterval(() => {
    void runDispatchRetrySweep().catch((error) => {
      console.warn(
        "[Printing] Dispatch retry sweep failed:",
        error instanceof Error ? error.message : String(error)
      );
    });
  }, intervalMs);

  if (typeof retryTimer.unref === "function") {
    retryTimer.unref();
  }
}

export function stopDispatchRetryScheduler(): void {
  if (retryTimer) {
    clearInterval(retryTimer);
    retryTimer = null;
  }
}

export async function initializeDispatchReliability(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    return;
  }

  try {
    const recovery = await replayAllPendingDispatchNotifications();
    if (recovery.attempted > 0) {
      console.log(
        `[Printing] Dispatch restart recovery: attempted=${recovery.attempted} notified=${recovery.notified} offline=${recovery.skippedOffline}`
      );
    }
  } catch (error) {
    console.warn(
      "[Printing] Dispatch restart recovery failed:",
      error instanceof Error ? error.message : String(error)
    );
  }

  startDispatchRetryScheduler();
}

export function resetDispatchReliabilityForTests(): void {
  stopDispatchRetryScheduler();
  retryInFlight = false;
}
