# DEPLOYMENT VERIFICATION

**Program:** POST-DEPLOYMENT-COMMERCIAL-OCCUPANCY-SMOKE-1  
**Probed at:** `2026-08-16T23:57:29.051Z`  
**Method:** GET only.

## Artifact

| Field | Value |
|-------|--------|
| Expected SHA | `2a5b7deb41032ca9341c87ee19f8a91cb39abfa2` |
| GitHub Production deployment | `5936622460` |
| Deployment SHA | `2a5b7deb41032ca9341c87ee19f8a91cb39abfa2` |
| Latest Production deployment | **this SHA** (no newer Production deploy) |
| Vercel status | success — "Deployment has completed" |
| Vercel deployment | `DHaNWWafBqubHV3MYKxZgdcyroGw` |
| Unique URL | `https://mineuqr-lvr9bqun8-mineuqr-s-projects.vercel.app` (SSO 401) |
| Live origin | `https://www.mineuqr.com` |
| App version endpoint | none — identity is the Production deployment SHA |

No redeploy was created.

## Health

| Probe | Result |
|-------|--------|
| `GET /` | HTTP **200** — title MineuQR; `x-vercel-id` present |
| `GET /api/realtime/health` | HTTP **200** — `{ enabled: true, connections: 0 }`; Express |
| Unique Vercel URL | HTTP 401 Protected deployment (expected) |
| Schema / occupancy / missing-module text | **none** |

Startup crash: none observed. Application is serving.
