/**
 * POST-CONFIRM OPERATIONAL RECOVERY
 * Discovers durable pending/failed outbox rows and undelivered Check work.
 * Must not run inside the Collection Fact transaction. Must not block Confirm HTTP.
 *
 * RECOVERY-RESILIENCE-AND-DURABILITY-HARDENING-1 Phase 3
 * Each family runs in its own try/catch. A failed task is logged and the
 * remaining families still run. The failed task stays retryable next cycle.
 */
import { opsLog } from "../_core/opsLog";
import { OPS_EVENT } from "../_core/opsTaxonomy";
import { recoverCashierPosDownstreamSettlements } from "../operational-session/payment/recoverCashierPosDownstreamSettlement";
import { recoverCollectionFactDrawerAttributions } from "../operational-session/payment/recoverCollectionFactDrawerAttribution";
import { orderEventRelay, orderOutboxRepository } from "./eventInfrastructureComposition";

export const RECOVERY_CYCLE_TASKS = [
  "requeueFailedBatch",
  "processBatch",
  "recoverCashierPosDownstreamSettlements",
  "recoverCollectionFactDrawerAttributions",
] as const;

export type RecoveryCycleTaskName = (typeof RECOVERY_CYCLE_TASKS)[number];

export type RecoveryCycleTaskResult = Readonly<{
  task: RecoveryCycleTaskName;
  status: "succeeded" | "failed";
  error: string | null;
}>;

export type RecoveryCycleResult = Readonly<{
  tasks: readonly RecoveryCycleTaskResult[];
}>;

async function runIsolatedRecoveryTask(
  task: RecoveryCycleTaskName,
  run: () => Promise<unknown>
): Promise<RecoveryCycleTaskResult> {
  try {
    await run();
    return { task, status: "succeeded", error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    opsLog({
      type: OPS_EVENT.recovery_cycle_task_failed,
      category: "ORDER",
      severity: "warn",
      ts: new Date().toISOString(),
      action: "runPostConfirmOperationalRecoveryCycle",
      metadata: { task, error },
    });
    return { task, status: "failed", error };
  }
}

export async function runPostConfirmOperationalRecoveryCycle(): Promise<RecoveryCycleResult> {
  const tasks: RecoveryCycleTaskResult[] = [];
  tasks.push(
    await runIsolatedRecoveryTask("requeueFailedBatch", () =>
      orderOutboxRepository.requeueFailedBatch(25)
    )
  );
  tasks.push(
    await runIsolatedRecoveryTask("processBatch", () =>
      orderEventRelay.processBatch(50)
    )
  );
  tasks.push(
    await runIsolatedRecoveryTask("recoverCashierPosDownstreamSettlements", () =>
      recoverCashierPosDownstreamSettlements(25)
    )
  );
  tasks.push(
    await runIsolatedRecoveryTask("recoverCollectionFactDrawerAttributions", () =>
      recoverCollectionFactDrawerAttributions(25)
    )
  );
  return { tasks };
}

export function schedulePostConfirmOperationalRecovery(): void {
  if (process.env.NODE_ENV === "test") return;
  const kick = () => {
    void runPostConfirmOperationalRecoveryCycle();
  };
  if (typeof setImmediate === "function") {
    setImmediate(kick);
  } else {
    setTimeout(kick, 0);
  }
}

const RECOVERY_INTERVAL_MS = 30_000;

let recoveryTimer: ReturnType<typeof setInterval> | null = null;

export function startPostConfirmOperationalRecoveryLoop(): void {
  if (process.env.NODE_ENV === "test") return;
  if (recoveryTimer) return;
  schedulePostConfirmOperationalRecovery();
  recoveryTimer = setInterval(() => {
    schedulePostConfirmOperationalRecovery();
  }, RECOVERY_INTERVAL_MS);
  if (typeof recoveryTimer === "object" && "unref" in recoveryTimer) {
    recoveryTimer.unref();
  }
}
