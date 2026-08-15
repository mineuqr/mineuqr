# DEPLOYMENT PROOF

## Git

| Field | Value |
|-------|--------|
| Baseline HEAD | `e936e654` (`test(commercial): align live plan identity guard`) |
| Commit | `56ce4bc2416ed77c98077978a15373c742aa857c` |
| Message | `feat(commercial): deploy charged terms snapshot runtime` |
| Push | `e936e654..56ce4bc2  main -> main` |
| Local HEAD | `56ce4bc2416ed77c98077978a15373c742aa857c` |
| `origin/main` | `56ce4bc2416ed77c98077978a15373c742aa857c` |

JSON Production dumps were not committed.

## Production deployment

| Field | Value |
|-------|--------|
| Mechanism | GitHub → Vercel Production on `origin/main` |
| Build command | `node scripts/migration-governance-guard.cjs && pnpm build` |
| Migration during deploy | **NONE** |
| GitHub Production deployment id | `5923152367` |
| Environment | Production |
| Created | `2026-08-15T18:00:52Z` |
| Status | `success` — "Deployment has completed" |
| Deployment URL | `https://mineuqr-axeiqkxeb-mineuqr-s-projects.vercel.app` |
| Live origin | `https://www.mineuqr.com` |
| Migration Governance CI | run `31899864517` — success (22s) |

The unique Vercel URL is SSO-protected (HTTP 401). Live origin served the application (HTTP 200).
