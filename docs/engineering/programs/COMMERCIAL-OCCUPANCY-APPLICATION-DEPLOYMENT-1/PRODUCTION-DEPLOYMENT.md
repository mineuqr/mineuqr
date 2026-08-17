# PRODUCTION DEPLOYMENT

**Program:** COMMERCIAL-OCCUPANCY-APPLICATION-DEPLOYMENT-1

| Field | Value |
|-------|--------|
| DEPLOYMENT PLATFORM | GitHub → Vercel Production on `origin/main` |
| Build command | `node scripts/migration-governance-guard.cjs && pnpm build` |
| Migration during deploy | **NONE** (`pnpm db:migrate` not run; 0094 not re-applied; 0095 not created) |
| Environment variables / secrets / domains | unchanged |
| DEPLOYED COMMIT | `2a5b7deb41032ca9341c87ee19f8a91cb39abfa2` |
| Certified occupancy ancestor | `bc865626c1cde8dd0434b6ca797786077ed280bb` |
| Commit message (HEAD) | `docs(commercial): record 0094 governance commit hash` |
| DEPLOYMENT ID (GitHub Production) | `5936622460` |
| Vercel deployment | `DHaNWWafBqubHV3MYKxZgdcyroGw` |
| Vercel status context | success — "Deployment has completed" |
| START TIME | `2026-08-16T23:34:20Z` |
| END TIME | `2026-08-16T23:34:21Z` |
| RESULT | **success** |
| Deployment URL | `https://mineuqr-lvr9bqun8-mineuqr-s-projects.vercel.app` |
| Live origin | `https://www.mineuqr.com` |
| Migration Governance CI | run `31979435104` — success (21s) |

The existing Production workflow deploys on push to `origin/main`. Predecessor COMMERCIAL-GIT-GOVERNANCE-0094-COMMIT-1 already pushed the certified occupancy unit and the governance-hash docs commit. This program did not push, restore, reset, or clean. It verified ancestry, re-ran the certified gates, and confirmed the Production deployment of that exact SHA.

Unique Vercel URL is SSO-protected (HTTP 401). Live origin serves the application (HTTP 200).

No `vercel` CLI deploy was invented. No infrastructure architecture was changed.
