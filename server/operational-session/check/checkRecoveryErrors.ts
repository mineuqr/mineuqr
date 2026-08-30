/**
 * RECOVERY-RESILIENCE-AND-DURABILITY-HARDENING-1 Phase 1
 * Typed Check Recovery failures. Do not reuse DiningSessionUnavailableError
 * for a missing Order — that class means database/infrastructure unavailability.
 */
export class CheckOrderNotFoundError extends Error {
  readonly code = "ORDER_NOT_FOUND" as const;

  constructor(message = "Order not found") {
    super(message);
    this.name = "CheckOrderNotFoundError";
  }
}

export function isCheckOrderNotFoundError(
  err: unknown
): err is CheckOrderNotFoundError {
  return err instanceof CheckOrderNotFoundError;
}
