/**
 * COMMERCIAL-PERSISTENT-CATALOG-BOOTSTRAP-1
 * Controlled one-shot / idempotent durable catalog bootstrap.
 *
 * Usage: pnpm exec tsx scripts/bootstrap-persistent-commercial-catalog.mts
 */
import "dotenv/config";
import {
  bootstrapPersistentCommercialCatalog,
  setDurableLivePlanBackendForTests,
  invalidateCatalogReadyGate,
} from "../server/services/commercial-catalog/index.ts";

async function main() {
  setDurableLivePlanBackendForTests(null);
  invalidateCatalogReadyGate();
  const first = await bootstrapPersistentCommercialCatalog();
  console.log(JSON.stringify({ first }, null, 2));
  const second = await bootstrapPersistentCommercialCatalog();
  console.log(JSON.stringify({ second }, null, 2));
  if (!first.bootstrapped && first.reason !== "already_initialized") {
    process.exitCode = 1;
  }
  if (second.reason !== "already_initialized") {
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
