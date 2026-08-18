/**
 * CASHIER-SETTLEMENT-UNKNOWN-RESULT-RECOVERY-1
 * Observability-only recovery events. Not financial identity. Not an idempotency key.
 */

export const CASHIER_PAYMENT_RECOVERY_EVENTS = [
  "cashier_payment_recovery_started",
  "cashier_payment_recovery_check_result",
  "cashier_payment_recovery_sr_result",
  "cashier_payment_recovery_completed",
] as const;

export type CashierPaymentRecoveryEvent =
  (typeof CASHIER_PAYMENT_RECOVERY_EVENTS)[number];

type RecoveryLogFields = {
  restaurantId?: number | null;
  terminalId?: string | null;
  orderId?: number | null;
  checkId?: number | null;
  recoveryOutcome?: string | null;
  checkOutcome?: string | null;
  settlementRecordFound?: boolean;
  durationMs?: number | null;
};

function emit(event: CashierPaymentRecoveryEvent, fields: RecoveryLogFields): void {
  const payload = {
    type: event,
    category: "ORDER",
    severity: "info",
    ts: new Date().toISOString(),
    restaurantId: fields.restaurantId ?? null,
    action: "cashier.payment_recovery",
    metadata: {
      orderId: fields.orderId ?? null,
      checkId: fields.checkId ?? null,
      terminalId: fields.terminalId ?? null,
      recoveryOutcome: fields.recoveryOutcome ?? null,
      checkOutcome: fields.checkOutcome ?? null,
      settlementRecordFound: fields.settlementRecordFound ?? null,
      durationMs: fields.durationMs ?? null,
    },
  };
  console.info(`[OPS][ORDER][info] ${event}`, payload);
}

export function emitCashierPaymentRecoveryStarted(
  fields: RecoveryLogFields
): void {
  emit("cashier_payment_recovery_started", fields);
}

export function emitCashierPaymentRecoveryCheckResult(
  fields: RecoveryLogFields
): void {
  emit("cashier_payment_recovery_check_result", fields);
}

export function emitCashierPaymentRecoverySrResult(
  fields: RecoveryLogFields
): void {
  emit("cashier_payment_recovery_sr_result", fields);
}

export function emitCashierPaymentRecoveryCompleted(
  fields: RecoveryLogFields
): void {
  emit("cashier_payment_recovery_completed", fields);
}
