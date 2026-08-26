/**
 * POST-CONFIRM OPERATIONAL RECOVERY
 * Discovers durable pending/failed outbox rows and undelivered Check work.
 * Must not run inside the Collection Fact transaction. Must not block Confirm HTTP.
 */
import { recoverCashierPosDownstreamSettlements } from "../operational-session/payment/recoverCashierPosDownstreamSettlement";
import { orderEventRelay, orderOutboxRepository } from "./eventInfrastructureComposition";

export async function runPostConfirmOperationalRecoveryCycle(): Promise<void> {
  await orderOutboxRepository.requeueFailedBatch(25);
  await orderEventRelay.processBatch(50);
  await recoverCashierPosDownstreamSettlements(25);
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
