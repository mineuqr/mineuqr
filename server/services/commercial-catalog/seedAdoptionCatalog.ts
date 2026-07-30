/**
 * COMMERCIAL-CATALOG-PLATFORM-ADOPTION-1
 * Ready gate entry — delegates empty-catalog initialization to
 * COMMERCIAL-PERSISTENT-CATALOG-BOOTSTRAP-1 (Projection-backed durable bootstrap).
 *
 * Idempotent: skips when published versions already exist.
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
  if (result.reason === "already_published") {
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
