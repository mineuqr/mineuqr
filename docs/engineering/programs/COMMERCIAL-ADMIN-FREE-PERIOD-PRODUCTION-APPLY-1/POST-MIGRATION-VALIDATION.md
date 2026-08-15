# POST-MIGRATION VALIDATION

**Mode:** SELECT / INFORMATION_SCHEMA only.  
**Evidence:** `_POST-APPLY.json`  
**Queried at:** `2026-08-15T21:19:30.649Z`

| Check | Result |
|-------|--------|
| `DATABASE()` | `mineuqr` |
| Journal terminus | 0090 `bd9989fa8f3fd1698c8b26df8d71c3dca44c6df21e2ba9dca44c4a60fc330997` |
| Journal id | 6144102 |
| `created_at` | 1784760000000 (matches local journal `when`) |
| `count_hash_0090` | **1** (exactly once) |
| Production hash == local | **YES** |
| Concession table | **PRESENT** |
| Concession rows | **0** |

## Schema vs approved 0090

Columns (order): `id` PK varchar(36), `subscriptionId` int NOT NULL, `planId` varchar(36), `billingCycleCode` varchar(64), `unit` varchar(16), `duration` int, `startsAt` timestamp, `endsAt` timestamp, `status` varchar(16), `version` int, `source` varchar(32), `actorId` int NULL, `reason` varchar(512), `supersededBy` varchar(36) NULL, `cancelledAt` timestamp NULL, `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP.

Indexes:

- PRIMARY (`id`)
- UNIQUE `commercial_concessions_sub_version_uq` (`subscriptionId`, `version`) — one version / current-concession protection
- INDEX `commercial_concessions_sub_status_ends_idx` (`subscriptionId`, `status`, `endsAt`)

No extra columns. No MySQL FK (not in approved SQL).
