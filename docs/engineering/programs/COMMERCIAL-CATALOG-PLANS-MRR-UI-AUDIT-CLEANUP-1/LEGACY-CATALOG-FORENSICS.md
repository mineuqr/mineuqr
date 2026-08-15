# LEGACY-CATALOG-FORENSICS.md

Versioned catalog tables were **dropped** in 0086. Historical Architecture Authority programs document that. Do not delete migrations or those program folders.

| Artifact | Class | Action |
|----------|-------|--------|
| `drizzle/0084`, `0085`, `0086` SQL | HISTORICAL | Keep |
| `snapshotLoader.ts` | ACTIVE_RUNTIME (loads **live** plan) | Keep; rename is REVIEW_REQUIRED |
| `OPS_EVENT.commercial_snapshot_*` | LEGACY event names on live bind | Keep; rename later |
| `commercialSnapshotRuntimeAuthority.test.ts` | ACTIVE_TEST (name leftover) | Keep |
| VersionCompare / DeepClone / PublicationDiff panels | ACTIVE_UI stubs | Keep; REVIEW_REQUIRED to remove from shell |
| `docs/.../COMMERCIAL-SNAPSHOT-*` | HISTORICAL AA | Keep |
| `drizzle/meta/*_snapshot.json` | Drizzle migration snapshots | Keep |
| `publishVersion` / `createVersion` APIs | DEAD (guards forbid) | Already absent |

No SAFE_TO_DELETE versioned-catalog implementation files remain that are unreferenced.
