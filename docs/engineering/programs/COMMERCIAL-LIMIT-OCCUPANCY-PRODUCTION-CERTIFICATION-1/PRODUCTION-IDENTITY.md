# PRODUCTION IDENTITY

**Program:** COMMERCIAL-LIMIT-OCCUPANCY-PRODUCTION-CERTIFICATION-1  
**Queried at:** 2026-08-16T22:58:30.644Z  
**Credentials:** not recorded.

## Verdict

`ACCEPT_PRODUCTION`

The certification queries used `DATABASE_URL` only. The inspector refused G07 / stagIn / same SQL user as G07 before any query.

## Evidence (no secrets)

| Check | Result |
|-------|--------|
| Target is Production | YES — certified host + Production SQL user prefix |
| Database | `mineuqr` (`DATABASE()` confirmed) |
| Host | `gateway01.eu-central-1.prod.aws.tidbcloud.com` |
| Port | 4000 |
| TLS | true |
| Exact certified Production host | true |
| Production SQL user prefix | `43cECBySTU9sFco` |
| Same SQL user as G07 | **false** |
| Looks like stagIn user (`3BUSFE99csVhDLu`) | **false** |
| Engine | `8.0.11-TiDB-v8.5.3-serverless` |
| Local Docker MySQL | NO |
| MySQL 8 occupancy test database | NO |
| `mineuqr-stagIn` branch user | NO |

## Isolation note

TiDB Cloud host may be shared. Isolation is the **SQL user prefix**, not the hostname.

- Production: `43cECBySTU9sFco`
- G07 / stagIn (regression only): `3BUSFE99csVhDLu`

G-07…G-11 ran only through `G07_DATABASE_URL` and recorded `sameSqlUserAsProductionMain: false` / `ACCEPT_NON_PRODUCTION`.

## Not exposed

Password, full DSN, and full SQL username are not written here.
