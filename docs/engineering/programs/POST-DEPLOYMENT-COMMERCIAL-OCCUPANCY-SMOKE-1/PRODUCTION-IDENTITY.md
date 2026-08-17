# PRODUCTION IDENTITY

**Program:** POST-DEPLOYMENT-COMMERCIAL-OCCUPANCY-SMOKE-1  
**Queried at:** `2026-08-16T23:58:24.160Z`  
**Credentials:** not recorded.

## Verdict

`ACCEPT_PRODUCTION`

Inspector used `DATABASE_URL` only. It refused G07 / stagIn / same SQL user as G07 before any query. `DATABASE()` confirmed `mineuqr`.

## Evidence (no secrets)

| Check | Result |
|-------|--------|
| Application origin | `https://www.mineuqr.com` |
| Target is Production | YES — certified host + Production SQL user prefix |
| Database | `mineuqr` |
| Host | `gateway01.eu-central-1.prod.aws.tidbcloud.com` |
| Port | 4000 |
| TLS | true |
| Exact certified Production host | true |
| Production SQL user prefix | `43cECBySTU9sFco` |
| Same SQL user as G07 | **false** |
| Looks like stagIn user (`3BUSFE99csVhDLu`) | **false** |
| Engine | `8.0.11-TiDB-v8.5.3-serverless` |
| `mineuqr-stagIn` | NO |
| `G07_DATABASE_URL` / `TIDB_TEST_DATABASE_URL` | NOT USED |
| Local / Docker MySQL | NO |

TiDB Cloud host may be shared. Isolation is the SQL user prefix, not the hostname.
