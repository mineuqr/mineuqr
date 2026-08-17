# POST-DEPLOY VERIFICATION

**Program:** COMMERCIAL-OCCUPANCY-APPLICATION-DEPLOYMENT-1  
**Probed at:** `2026-08-16T23:50:29.018Z`  
**Method:** GET only. No payment. No resource create. No Commercial mutation.

## Immediate checks

| Check | Result |
|-------|--------|
| Deployment completed successfully | PASS — GitHub `5936622460` / Vercel `DHaNWWafBqubHV3MYKxZgdcyroGw` success |
| Application serving | PASS — `https://www.mineuqr.com/` HTTP 200, title MineuQR |
| Existing health endpoint | PASS — `GET /api/realtime/health` HTTP 200 `{ enabled: true, connections: 0 }` |
| Application version/commit exposed | Not exposed by the application; identity is the Vercel/GitHub Production SHA `2a5b7deb` |
| Startup crash | NONE observed |
| Database schema error | NONE in probed responses |
| Commercial occupancy initialization failure | NONE observed (occupancy is on-demand; no startup occupancy init) |

## Probes

| Probe | Result |
|-------|--------|
| `GET https://www.mineuqr.com/` | HTTP 200 — `x-vercel-id` `cdg1::fwxln-1786924230547-ab9a08bd6548`; `x-vercel-cache` MISS |
| Unique Vercel URL | HTTP 401 — Protected deployment (SSO), same as prior Production deploys |
| `GET /api/realtime/health` | HTTP 200 — Express; `x-powered-by` Express |
| `commercialCatalog.public.status` | HTTP 200 — public-catalog surface up; entitlement authority remains subscription-runtime |

No schema / missing-table / occupancy-unavailable text in any response body.

Complete Commercial occupancy smoke is **not** in this program. Next: POST-DEPLOYMENT-COMMERCIAL-OCCUPANCY-SMOKE-1.

## Production safety

| Action | This program |
|--------|----------------|
| INSERT / UPDATE / DELETE | **0** |
| DDL | **0** |
| `pnpm db:migrate` | **0** |
| 0094 re-apply | **0** |
| 0095 | **0** |
| Seed / repair / cleanup scripts | **0** |
| Commercial plan updates | **0** |
| Resource create / delete | **0** |
| SQL of any kind | **0** |

Vercel Production build runs only the governance guard + `pnpm build`. That is a platform application redeploy, not a business-data mutation.

**Production business-data mutation = 0**  
**Migration = 0**  
**Rollback = 0**
