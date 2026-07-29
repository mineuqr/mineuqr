# OBSERVABILITY

Exposed via `commercialCatalog.adoptionStatus` → `runtimeAuthority`:

| Metric | Invariant |
|--------|-----------|
| `snapshotResolutionCount` | Bound resolves |
| `legacyBridgeCount` | Unbound only |
| `mixedResolutionCount` | **MUST = 0** (immutable) |
| `snapshotBindingCoverageChecks` / `snapshotBoundPresent` | Coverage |
| `snapshotCreationFailures` | Bind/hydrate failures |
| `legacyBridgeConsumers` | Consumer labels |

Audit OPS events: Snapshot Created / Bound / Activated; Upgrade|Downgrade|Renewal Snapshot Created.
