# BRANCH IDENTITY

**Program:** COMMERCIAL-LIMIT-OCCUPANCY-TIDB-CONCURRENCY-PROOF-1  
**Date:** 2026-08-16  
**STATUS:** STOP — BRANCH CONNECTION STRING NOT IN THIS PROCESS  
**Mutation:** NONE  
**Production connection:** NONE  

## Required target (operator)

| Field | Value |
|-------|--------|
| TiDB Cloud branch | `mineuqr-stagIn` |
| Database name | `mineuqr` |
| Parent | `main` |
| Must not use | Production / `main` / workspace `DATABASE_URL` |

The branch database name may still be `mineuqr`. Isolation is the **branch endpoint / SQL user prefix**, not the schema name.

## What this process actually has

| Source | Result |
|--------|--------|
| `G07_DATABASE_URL` | **ABSENT** |
| `TIDB_TEST_DATABASE_URL` | **ABSENT** |
| `ticloud` CLI | **ABSENT** |
| Workspace `DATABASE_URL` | Production **main** host `gateway01.eu-central-1.prod.aws.tidbcloud.com`, database `mineuqr` |

That `DATABASE_URL` is the Production connection. Using it would hit `main`, not `mineuqr-stagIn`. **Refused.**

## Checks requested (not executed)

No branch session was opened, so these remain unproven:

1. Branch = `mineuqr-stagIn`
2. Database = `mineuqr` on that branch
3. Not `main`
4. Endpoint belongs to the branch
5. Journal state
6. Whether 0094 exists
7. TiDB version
8. Transaction isolation

## Required environment variable

**`G07_DATABASE_URL`**

Alias: `TIDB_TEST_DATABASE_URL`

Value: the TiDB Cloud **Connect** string for branch `mineuqr-stagIn` (console → cluster → Branches → `mineuqr-stagIn` → Connect, or overview Connect with Branch = `mineuqr-stagIn`).

Must **not** be the Production `main` string already in `.env` `DATABASE_URL`.

TiDB Cloud branches use a distinct SQL **user prefix**. The branch URL will not match Production host+user even if the host region looks similar and the database name is still `mineuqr`.

Place it in:

- Cursor agent/session environment, or
- gitignored `.env` as a **new key** (do not replace `DATABASE_URL`)

Do not paste the password into chat, source, or docs.

After it is present, G-07 will classify it against Production `DATABASE_URL` (compare only; no Production connect), then connect **only** to the branch.
