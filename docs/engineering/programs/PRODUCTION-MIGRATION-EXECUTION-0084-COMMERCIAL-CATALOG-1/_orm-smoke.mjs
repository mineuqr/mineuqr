/**
 * PRODUCTION-MIGRATION-EXECUTION-0084-COMMERCIAL-CATALOG-1
 * Application smoke — Catalog services + validator initialize (no HTTP server).
 */
import {
  getCommercialCatalogHealth,
  publicationValidator,
  planService,
  publicationService,
  commercialSnapshotService,
} from "../../../../server/services/commercial-catalog/index.ts";
import {
  COMMERCIAL_CATALOG_FOUNDATION_PROGRAM,
  validatePublication,
} from "../../../../shared/commercial-catalog/index.ts";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const health = getCommercialCatalogHealth();
assert(
  health.program === COMMERCIAL_CATALOG_FOUNDATION_PROGRAM,
  "health program mismatch"
);
assert(typeof publicationValidator.validate === "function", "validator missing");
assert(typeof planService.list === "function", "planService missing");
assert(typeof publicationService.publish === "function", "publicationService missing");
assert(
  typeof commercialSnapshotService.captureFromVersion === "function",
  "snapshot service missing"
);
assert(typeof validatePublication === "function", "pure validator missing");

console.log(
  JSON.stringify(
    {
      APP_CATALOG_SMOKE: "OK",
      program: health.program,
      healthStatus: health.status,
      plans: health.plans,
      versions: health.versions,
    },
    null,
    2
  )
);
