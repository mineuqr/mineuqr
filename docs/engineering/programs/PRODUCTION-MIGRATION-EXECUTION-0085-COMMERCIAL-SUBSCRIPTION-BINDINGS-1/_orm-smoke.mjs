/**
 * PRODUCTION-MIGRATION-EXECUTION-0085-COMMERCIAL-SUBSCRIPTION-BINDINGS-1
 * Application smoke — Catalog + Snapshot Runtime Authority + binding APIs.
 */
import {
  getCommercialCatalogHealth,
  getAdoptionObservability,
  getSubscriptionCommercialBinding,
  ensureCatalogReady,
  commercialSnapshotService,
  commercialRuntimeAuthorityObservability,
} from "../../../../server/services/commercial-catalog/index.ts";
import { COMMERCIAL_CATALOG_FOUNDATION_PROGRAM } from "../../../../shared/commercial-catalog/index.ts";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

await ensureCatalogReady();

const health = getCommercialCatalogHealth();
assert(
  health.program === COMMERCIAL_CATALOG_FOUNDATION_PROGRAM,
  "health program mismatch"
);
assert(
  typeof commercialSnapshotService.captureFromVersion === "function",
  "snapshot service missing"
);
assert(
  typeof getSubscriptionCommercialBinding === "function",
  "binding lookup missing"
);

// Binding lookup against empty / non-existent subscription must not throw.
const binding = await getSubscriptionCommercialBinding(0);
assert(binding === null, "expected null binding for subscriptionId=0");

const runtime = commercialRuntimeAuthorityObservability.snapshot();
assert(runtime.mixedResolutionCount === 0, "mixedResolutionCount must be 0");
assert(
  runtime.program === "COMMERCIAL-SNAPSHOT-RUNTIME-AUTHORITY-1",
  "runtime authority program mismatch"
);

const adoption = getAdoptionObservability();
assert(adoption.runtimeAuthority != null, "runtimeAuthority metrics missing");
assert(
  adoption.runtimeAuthority.mixedResolutionCount === 0,
  "adoption mixedResolutionCount must be 0"
);

console.log(
  JSON.stringify(
    {
      APP_CATALOG_SMOKE: "OK",
      BINDING_LOOKUP_SMOKE: "OK",
      RUNTIME_AUTHORITY_SMOKE: "OK",
      program: health.program,
      healthStatus: health.status,
      mixedResolutionCount: runtime.mixedResolutionCount,
      bindingLookupNullOk: binding === null,
    },
    null,
    2
  )
);
