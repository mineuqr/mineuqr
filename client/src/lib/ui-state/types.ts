/**
 * DASHBOARD-ERROR-STATE-ARCHITECTURE-1 — official MineuQR async UI phases.
 * Presentation-only. Never infer Empty from missing data without excluding Error.
 */

export type AsyncUiPhase =
  | "loading"
  | "unauthorized"
  | "forbidden"
  | "error"
  | "success"
  | "empty";

/**
 * Backend / transport failure classes for presentation mapping.
 * Unknown and database details must never reach the user as raw text.
 */
export type QueryErrorKind =
  | "unauthorized"
  | "forbidden"
  | "validation"
  | "business_rule"
  | "network"
  | "database"
  | "unknown";

export type ResolveAsyncUiStateInput = Readonly<{
  /** Auth bootstrap still in flight. */
  authPending: boolean;
  isAuthenticated: boolean;
  /**
   * Primary query has not produced a settled success/error yet.
   * Prefer React Query `isPending` (no data + fetching).
   */
  queryPending: boolean;
  isError: boolean;
  error: unknown | null | undefined;
  /**
   * Query settled successfully and the resource/collection is empty.
   * Must only be true when `isError` is false.
   */
  isEmpty: boolean;
  /**
   * Query settled successfully with a presentable payload
   * (including empty collections when `isEmpty` is used).
   */
  isSuccess: boolean;
}>;
