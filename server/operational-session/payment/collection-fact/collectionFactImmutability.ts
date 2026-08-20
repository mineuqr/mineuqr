/**
 * PRODUCTION-COLLECTION-FACT-COMMIT-EXECUTION-HARDENING-1
 * Runtime immutability for Collection Fact objects after commit.
 * Complements I-COL-02 (no UPDATE/DELETE). Does not change the commit contract.
 */

import type { CollectionFact } from "@shared/operational-session/payment/collection-fact";

function freezeDeep(value: unknown): void {
  if (value === null || typeof value !== "object") return;
  Object.freeze(value);
  if (Array.isArray(value)) {
    for (const item of value) freezeDeep(item);
    return;
  }
  for (const child of Object.values(value as Record<string, unknown>)) {
    freezeDeep(child);
  }
}

export function freezeCollectionFact(fact: CollectionFact): CollectionFact {
  const cloned = structuredClone(fact);
  freezeDeep(cloned);
  return cloned;
}
