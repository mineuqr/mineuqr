# PRE-DEPLOY GATE

**Program:** COMMERCIAL-OCCUPANCY-APPLICATION-DEPLOYMENT-1

## Git

```
git branch --show-current          main
git status --short                 (empty)
git rev-parse HEAD                 2a5b7deb41032ca9341c87ee19f8a91cb39abfa2
git rev-parse origin/main          2a5b7deb41032ca9341c87ee19f8a91cb39abfa2
```

`git fetch origin main` confirmed HEAD = `origin/main`.  
`git merge-base --is-ancestor bc865626c1cde8dd0434b6ca797786077ed280bb HEAD` = YES.

```
2a5b7deb docs(commercial): record 0094 governance commit hash
bc865626 feat(commercial): finalize occupancy enforcement and migration 0094
```

| Check | Result |
|-------|--------|
| Branch | `main` |
| Working tree | clean |
| HEAD = origin/main | PASS |
| Certified occupancy commit present | PASS |
| Uncommitted working tree deployed | NO |

## TypeScript / build

| Gate | Result |
|------|--------|
| `pnpm check` | **188** `error TS*` (exit non-zero because baseline errors exist) |
| `pnpm build` | PASS — Vite client + `dist/index.js` + `dist/vercel-api.mjs` |

## Certified regression

TiDB suites used `G07_DATABASE_URL` only (`ACCEPT_NON_PRODUCTION`). Not Production. `0094` was not applied.

| Suite | Result |
|-------|--------|
| G-07 | 12/12 PASS |
| G-08 | 18/18 PASS |
| Cascade TOCTOU | 12/12 PASS |
| G-09 | 10/10 PASS |
| G-10 | 9/9 PASS |
| G-11 | 15/15 PASS |
| Final Commercial Occupancy Audit (unit/guards) | 13 files / 71 PASS |
| POS Commercial (provision / replace / isolation / auth guards) | 9 files / 43 PASS |
| Governance guard | OK — tail `0094_commercial_limit_occupancy_locks`, 95 entries |
| Governance tests | 17/17 PASS |

## Decision

**DEPLOY AUTHORIZED** against the certified `origin/main` artifact.
