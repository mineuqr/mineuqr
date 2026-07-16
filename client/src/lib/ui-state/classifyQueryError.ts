import { TRPCClientError } from "@trpc/client";
import type { QueryErrorKind } from "./types";

const SQL_LEAK_RE =
  /\b(select|insert|update|delete|alter|unknown column|failed query|drizzle|errno|sqlstate)\b/i;
const NETWORK_RE =
  /\b(network|fetch failed|failed to fetch|timeout|econnrefused|enotfound|offline)\b/i;
const DATABASE_RE =
  /\b(database|db_|mysql|tidb|connection (lost|refused)|pool)\b/i;

/**
 * Classify a query failure for presentation. Never trust raw message content for UX copy.
 */
export function classifyQueryError(error: unknown): QueryErrorKind {
  if (error instanceof TRPCClientError) {
    const code = String(error.data?.code ?? "");
    if (code === "UNAUTHORIZED") return "unauthorized";
    if (code === "FORBIDDEN") return "forbidden";
    if (code === "BAD_REQUEST" || code === "PARSE_ERROR") return "validation";
    if (
      code === "CONFLICT" ||
      code === "PRECONDITION_FAILED" ||
      code === "TOO_MANY_REQUESTS"
    ) {
      return "business_rule";
    }
    if (code === "TIMEOUT" || code === "CLIENT_CLOSED_REQUEST") return "network";
    if (code === "INTERNAL_SERVER_ERROR") {
      const msg = String(error.message ?? "");
      if (SQL_LEAK_RE.test(msg) || DATABASE_RE.test(msg)) return "database";
      return "unknown";
    }
    const msg = String(error.message ?? "");
    if (NETWORK_RE.test(msg)) return "network";
    if (SQL_LEAK_RE.test(msg) || DATABASE_RE.test(msg)) return "database";
    return "unknown";
  }

  if (error instanceof TypeError && NETWORK_RE.test(error.message)) {
    return "network";
  }
  if (error instanceof Error) {
    if (NETWORK_RE.test(error.message)) return "network";
    if (SQL_LEAK_RE.test(error.message) || DATABASE_RE.test(error.message)) {
      return "database";
    }
  }
  return "unknown";
}

/** True when the raw message looks like an implementation leak (SQL, stack, ORM). */
export function isUnsafeErrorMessage(message: string): boolean {
  const m = message.trim();
  if (!m) return true;
  if (SQL_LEAK_RE.test(m)) return true;
  if (/\bat\s+\S+\s+\(/i.test(m)) return true; // stack frames
  if (m.includes("\n    at ")) return true;
  if (m.length > 280) return true;
  return false;
}
