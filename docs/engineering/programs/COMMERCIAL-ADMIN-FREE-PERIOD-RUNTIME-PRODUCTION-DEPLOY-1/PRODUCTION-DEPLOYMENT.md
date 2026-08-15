# PRODUCTION DEPLOYMENT

| Field | Value |
|-------|--------|
| Mechanism | GitHub → Vercel Production on `origin/main` |
| Build command | `node scripts/migration-governance-guard.cjs && pnpm build` |
| Migration during deploy | **NONE** (`db:migrate` not run) |
| Commit | `625280ff3e5e1df71251984d79dc6b37886cf054` |
| Message | `feat(commercial): deploy admin free period runtime` |
| Push | `1b04693b..625280ff  main -> main` |
| GitHub Production deployment id | `5924893167` |
| Created | `2026-08-15T21:35:03Z` |
| Status | `success` — "Deployment has completed" |
| Deployment URL | `https://mineuqr-7c04y26xj-mineuqr-s-projects.vercel.app` |
| Live origin | `https://www.mineuqr.com` |
| Migration Governance CI | run `31909770000` — success (30s) |

Unique Vercel URL is SSO-protected (HTTP 401). Live origin served the application (HTTP 200).

JSON Production dumps were not committed.
