# LOCK DESIGN AUDIT

## Table (local SQL + Production)

`commercial_limit_occupancy_locks`

| Column | Role |
|--------|------|
| `scopeKind` varchar(16) | `owner` \| `restaurant` |
| `scopeId` int | tenant id |
| `limitKey` varchar(128) | quantity key |
| `createdAt` timestamp | insert time only |

PK: `(scopeKind, scopeId, limitKey)`. Production reports index name `PRIMARY` (TiDB), columns match.

**Not** an occupancy counter. No `occupied` column.

## Acquisition

```
INSERT … ON DUPLICATE KEY UPDATE limitKey = limitKey
SELECT scopeKind … FOR UPDATE
```

Create-if-absent without bumping a counter. Duplicate inserters serialize on `FOR UPDATE`.

## Contention

Isolated per tenant + limitKey. Unrelated tenants independent. Shared Commercial plan rows are **not** locked.

## Production

0094 applied; table empty (0 rows) at apply time. Rows appear lazily on first occupancy mutation **after** occupancy-adopting code is deployed.

## Governance drift

`scripts/lib/migration-governance-lib.cjs` still names canonical terminus **0093** / 94 entries while journal + Production are at **0094**. Application-source update belongs to GIT COMMIT, not this audit.
