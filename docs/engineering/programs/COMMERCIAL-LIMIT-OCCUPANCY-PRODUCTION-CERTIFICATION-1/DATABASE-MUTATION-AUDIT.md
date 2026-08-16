# DATABASE MUTATION AUDIT

**Program:** COMMERCIAL-LIMIT-OCCUPANCY-PRODUCTION-CERTIFICATION-1  
**Target:** Production `mineuqr` via `DATABASE_URL` only.

## Execution evidence

Inspector: `_readonly-certification.mjs`

- Wrapper refuses any statement that is not `SELECT` / `SHOW`.
- Successful certification run: **17 SELECT**, `refusedNonSelect = 0`.
- Evidence file: `PRODUCTION-CERTIFICATION-EVIDENCE.json` (`mutation: 0`).

An earlier attempt issued `SET SESSION TRANSACTION READ ONLY`. TiDB rejected it (`READ ONLY` is a noop / not implemented). That statement did not mutate data. It was removed. The certified run has no `SET`.

## Counts

| Kind | Count |
|------|-------|
| INSERT | 0 |
| UPDATE | 0 |
| DELETE | 0 |
| DDL | 0 |
| MIGRATION | 0 |
| `pnpm db:migrate` | **not run** |
| Seed / repair / backfill | 0 |

## Production mutation

**0**

G-07…G-11 used `G07_DATABASE_URL` only (`userPrefix` `3BUSFE99csVhDLu`, `ACCEPT_NON_PRODUCTION`). Those synthetic occupancy fixtures are not Production.

## Result

PASS — no unexpected Production mutation. STOP condition not triggered.
