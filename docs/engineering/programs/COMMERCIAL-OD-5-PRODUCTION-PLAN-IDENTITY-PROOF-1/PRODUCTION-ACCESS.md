# PRODUCTION-ACCESS

| Check | Result |
|-------|--------|
| `DATABASE_URL` present | Yes (not printed) |
| Host kind | `tidb_cloud` (`*.tidbcloud.com`) |
| Host pattern | `tidbcloud_prod` (`*.prod.*` + `gateway01`) |
| Database | `mineuqr` |
| TLS | Yes (port 4000) |
| Matches known production shape | **Yes** |
| Statements | SELECT + INFORMATION_SCHEMA only |
| Credentials logged | **No** |

Connection via existing `scripts/lib/tidb-audit-connection.mjs`.  
Evidence: `_QUERY-EVIDENCE.json` (`queriedAt` 2026-08-15T11:39:27.932Z, `DATABASE() = mineuqr`).

Not used as proof: local DB, staging, test DB, stale dump, 2026-08-14 historical report.
