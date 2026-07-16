/**
 * DASHBOARD-ERROR-STATE-ARCHITECTURE-1 — official React Query usage policy.
 *
 * Platform rule: Presentation must resolve UI phase via `resolveAsyncUiState`.
 * Never treat `!data?.length` as Empty while `isError` is true.
 */

/** Official meaning of React Query flags for MineuQR screens. */
export const REACT_QUERY_UI_POLICY = Object.freeze({
  /**
   * Use for initial Loading when the query has no settled data yet.
   * Prefer over `isLoading` for lifecycle decisions.
   */
  initialLoadingFlag: "isPending" as const,

  /**
   * Background refetch / retry in progress. Do not replace Success/Error with Loading.
   * May disable Retry buttons or show a subtle indicator.
   */
  backgroundFetchFlag: "isFetching" as const,

  /**
   * Must be evaluated before Empty. Failure → Error / Unauthorized / Forbidden phase.
   */
  errorFlag: "isError" as const,

  /**
   * Pass into classifiers / user-facing formatters. Never render raw to the UI.
   */
  errorObject: "error" as const,

  /**
   * Retry action = `refetch` (or mutation reset). Always offer for Error phase when safe.
   */
  retryAction: "refetch" as const,

  /**
   * Stale prior data must not be presented as Empty.
   * If `isError` and previous data exists, prefer Error phase (or keep Success with banner) —
   * never Empty.
   */
  staleDataRule: "never_empty_on_error" as const,

  /**
   * Avoid `placeholderData` / keepPreviousData patterns that collapse failures into Empty.
   * If used, still gate Empty behind `!isError && isSuccess`.
   */
  placeholderDataRule: "empty_only_after_success" as const,
});

/**
 * Derive list emptiness only after a successful, non-error settlement.
 */
export function isSuccessfulEmptyCollection(
  isError: boolean,
  isPending: boolean,
  data: unknown
): boolean {
  if (isError || isPending) return false;
  return Array.isArray(data) && data.length === 0;
}

/**
 * Derive list success (including empty arrays) after settlement without error.
 */
export function isSuccessfulCollectionResult(
  isError: boolean,
  isPending: boolean,
  data: unknown
): boolean {
  if (isError || isPending) return false;
  return data !== undefined;
}
