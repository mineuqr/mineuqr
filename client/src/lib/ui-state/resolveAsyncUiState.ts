import { classifyQueryError } from "./classifyQueryError";
import type { AsyncUiPhase, ResolveAsyncUiStateInput } from "./types";

/**
 * Official MineuQR async UI lifecycle resolver.
 *
 * Evaluation order (mandatory):
 * 1. Loading
 * 2. Authentication (unauthorized)
 * 3. Authorization (forbidden)
 * 4. Backend / network error
 * 5. Success
 * 6. Empty
 *
 * Empty must never be inferred before Error.
 */
export function resolveAsyncUiState(
  input: ResolveAsyncUiStateInput
): AsyncUiPhase {
  const {
    authPending,
    isAuthenticated,
    queryPending,
    isError,
    error,
    isEmpty,
    isSuccess,
  } = input;

  // 1. Loading — auth bootstrap or initial query (not when already errored)
  if (authPending) return "loading";
  if (isAuthenticated && queryPending && !isError) return "loading";

  // 2. Authentication
  if (!isAuthenticated) return "unauthorized";

  // 3–4. Authorization + backend/network errors (before empty/success)
  if (isError) {
    const kind = classifyQueryError(error);
    if (kind === "unauthorized") return "unauthorized";
    if (kind === "forbidden") return "forbidden";
    return "error";
  }

  // 5–6. Success vs Empty — empty only after confirmed non-error success
  if (isSuccess && isEmpty) return "empty";
  if (isSuccess) return "success";

  // Query disabled / unsettled without auth pending — treat as loading, never empty
  if (queryPending) return "loading";
  return "loading";
}
