import type { ReadQueryContext } from "./ReadQueryContext";

/**
 * Query application service contract (READ-ARCHITECTURE-1 RA-05).
 * Phase 1: interface only — handlers implemented in Phase 2+.
 */
export interface QueryHandler<TInput, TResult> {
  execute(input: TInput, ctx: ReadQueryContext): Promise<TResult>;
}
