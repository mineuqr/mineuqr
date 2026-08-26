/**
 * CRMP MySQL driver errors — repository boundary only.
 * Do not surface SQL index names to operators.
 */

export function isMysqlDuplicateKeyError(error: unknown): boolean {
  const errno = errnoFromError(error);
  if (errno === 1062) return true;
  const code = codeFromError(error);
  if (code === "ER_DUP_ENTRY") return true;
  if (error instanceof Error && /duplicate/i.test(error.message)) return true;
  return false;
}

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
