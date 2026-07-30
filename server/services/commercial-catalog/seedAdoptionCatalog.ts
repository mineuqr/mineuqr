/**
 * COMMERCIAL-CATALOG-PLATFORM-ADOPTION-1
 * COMMERCIAL-BOOTSTRAP-LIFECYCLE-GOVERNANCE-1
 *
 * Ready gate: hydrate durable catalog; bootstrap ONLY when uninitialized.
 * Initialized catalogs (published / draft / retired / deprecated) never republish.
 */

import {
  bootstrapPersistentCommercialCatalog,
} from "./persistentCatalogBootstrap";

/**
 * Hydrate durable catalog; bootstrap from Commercial Projection when empty.
 */
export async function ensureCommercialCatalogAdoptionSeed(): Promise<{
  source: "db" | "seeded" | "memory";
  publishedVersions: number;
}> {
  const result = await bootstrapPersistentCommercialCatalog();
  if (result.reason === "already_initialized") {
    return {
      source: result.source === "bootstrap" ? "memory" : result.source,
      publishedVersions: result.publishedVersions,
    };
  }
  return {
    source: result.bootstrapped ? "seeded" : result.source === "db" ? "db" : "memory",
    publishedVersions: result.publishedVersions,
  };
}
