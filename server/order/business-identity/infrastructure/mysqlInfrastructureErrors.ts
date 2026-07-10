/**
 * MySQL infrastructure error classification for Business Identity retry.
 * ORDER-BUSINESS-IDENTITY-HARDENING-1
 */

export type BusinessIdentityInfrastructureErrorKind =
  | "deadlock"
  | "lock_wait_timeout"
  | "unique_violation"
  | "connection"
  | "other";

const ER_DUP_ENTRY = 1062;
const ER_LOCK_DEADLOCK = 1213;
const ER_LOCK_WAIT_TIMEOUT = 1205;

function errnoFromError(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;
  const candidate = error as { errno?: number; cause?: unknown };
  if (typeof candidate.errno === "number") return candidate.errno;
  if (candidate.cause) return errnoFromError(candidate.cause);
  return null;
}

function codeFromError(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const candidate = error as { code?: string; cause?: unknown };
  if (typeof candidate.code === "string") return candidate.code;
  if (candidate.cause) return codeFromError(candidate.cause);
  return null;
}

export function classifyBusinessIdentityInfrastructureError(
  error: unknown
): BusinessIdentityInfrastructureErrorKind {
  const errno = errnoFromError(error);
  if (errno === ER_LOCK_DEADLOCK) return "deadlock";
  if (errno === ER_LOCK_WAIT_TIMEOUT) return "lock_wait_timeout";
  if (errno === ER_DUP_ENTRY) return "unique_violation";

  const code = codeFromError(error);
  if (code === "ER_LOCK_DEADLOCK") return "deadlock";
  if (code === "ER_LOCK_WAIT_TIMEOUT") return "lock_wait_timeout";
  if (code === "ER_DUP_ENTRY") return "unique_violation";

  if (
    code === "ECONNRESET" ||
    code === "ECONNREFUSED" ||
    code === "ETIMEDOUT" ||
    code === "PROTOCOL_CONNECTION_LOST"
  ) {
    return "connection";
  }

  return "other";
}

export function isRetryableBusinessIdentityInfrastructureError(error: unknown): boolean {
  const kind = classifyBusinessIdentityInfrastructureError(error);
  return (
    kind === "deadlock" ||
    kind === "lock_wait_timeout" ||
    kind === "unique_violation" ||
    kind === "connection"
  );
}
