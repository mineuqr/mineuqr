/**
 * COMMERCIAL-LIVE-PLANS-SIMPLIFICATION-1
 * Ready gate: hydrate durable live catalog; bootstrap ONLY when uninitialized.
 */

import { bootstrapPersistentCommercialCatalog } from "./persistentCatalogBootstrap";

export async function ensureCommercialCatalogAdoptionSeed(): Promise<{
  source: "db" | "seeded" | "memory";
  livePlans: number;
}> {
  const result = await bootstrapPersistentCommercialCatalog();
  if (result.reason === "already_initialized") {
    return {
      source: result.source === "bootstrap" ? "memory" : result.source,
      livePlans: result.livePlans,
    };
  }
  return {
    source: result.bootstrapped ? "seeded" : result.source === "db" ? "db" : "memory",
    livePlans: result.livePlans,
  };
}
