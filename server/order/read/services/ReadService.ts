import type { TenantScopedQuery } from "../domain/contracts/queryContracts";

/**
 * Read service contract — one implementation per query catalog entry (RA-05).
 */
export interface ReadService<TInput extends TenantScopedQuery | object, TResult> {
  query(input: TInput): Promise<TResult>;
}
