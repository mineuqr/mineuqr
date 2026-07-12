# CONNECTOR-VERSION-SYNC-1 — Engineering Report

**Status:** IMPLEMENTED  
**Date:** 2026-07-13  
**Program type:** Release governance / repository consistency only

## Summary

Eliminated Connector release version drift by re-syncing generated constants from the canonical manifest and removing a hardcoded version assertion from infrastructure tests. No Connector runtime, API, packaging, or deployment behavior was changed.

## Root cause

`connector-product/release/connector-release.json` was bumped to **1.0.2**, but `server/connector-product/release/connectorReleaseConstants.generated.ts` remained at **1.0.1** because `npm run connector:sync-version` had not been run after the manifest update.

Downstream consumers (`ConnectorProductService`, local connector identity, enrollment client, service entrypoints) read the stale generated constant, while tests and manifest readers expected **1.0.2**.

## Version source audit

| Source | Role | Version after sync |
|--------|------|-------------------|
| `connector-product/release/connector-release.json` | **Canonical authority** | 1.0.2 |
| `server/connector-product/release/connectorReleaseConstants.generated.ts` | Generated TypeScript constants | 1.0.2 |
| `connector-product/windows/generated/connector-installer-metadata.iss.inc` | Generated Inno Setup defines | 1.0.2 |
| `server/connector-product/release/connectorRelease.ts` | Reads manifest at runtime | 1.0.2 |
| `server/connector-product/ConnectorProductService.ts` | Uses generated constants | 1.0.2 |
| `server/connector-local/infrastructure/productIdentity.ts` | Re-exports generated constants | 1.0.2 |
| `scripts/sync-connector-release-constants.mjs` | Sync generator | derives from manifest |

**Single source of truth:** `connector-product/release/connector-release.json`  
**Sync command:** `npm run connector:sync-version` (also invoked by `npm run build:connector`)

## Files changed

- `server/connector-product/release/connectorReleaseConstants.generated.ts` — synced to 1.0.2
- `connector-product/windows/generated/connector-installer-metadata.iss.inc` — regenerated from manifest
- `server/connector-product/__tests__/connectorReleaseInfrastructure.test.ts` — removed hardcoded `1.0.1` installer filename assertion; derives from manifest
- `server/connector-product/__tests__/releaseInfrastructure.architecture.guards.test.ts` — added guard that generated constants match canonical manifest

## Validation summary

| Check | Result |
|-------|--------|
| Manifest vs generated constants | Match (1.0.2) |
| Connector infrastructure tests | **17/17 PASS** |
| Architecture guards | **8/8 PASS** |
| No hardcoded 1.0.1 in connector-product paths | Verified |
| Production build | **PASS** |

### Connector test files verified

- `connectorReleaseInfrastructure.test.ts` — 6/6
- `releaseInfrastructure.architecture.guards.test.ts` — 8/8
- `ConnectorProductService.test.ts` — 3/3

## Functional change assessment

No runtime behavior, API, database, packaging logic, or deployment pipeline changes. This program restores repository consistency only.

## Operational note

After bumping `connector-release.json`, always run:

```bash
npm run connector:sync-version
```

Or rely on `npm run build:connector`, which runs sync before bundling.

## Certification recommendation

**RECOMMEND APPROVAL** for CONNECTOR-VERSION-SYNC-1.

Connector infrastructure tests are green and the repository exposes a single authoritative release version (**1.0.2**) across manifest, generated constants, installer metadata, and test expectations.
