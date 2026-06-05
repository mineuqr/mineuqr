# AUTH2 documentation index

MineuQR authentication engineering (AUTH2) — **closed** as of D.7. Use this index instead of searching the repo.

## Operator / incident

| Doc | Use when |
|-----|----------|
| [auth-ops-signals.md](./auth-ops-signals.md) | Interpreting `[OPS][AUTH]` logs |
| [deployment-auth-readiness.md](./deployment-auth-readiness.md) | Staging deploy, proxy, cookies, env |
| `server/_core/authOpsSignalGuide.ts` | Programmatic event descriptions |

## Contributor / maintainer

| Doc | Use when |
|-----|----------|
| [AUTH2_CLOSURE.md](./AUTH2_CLOSURE.md) | Boundaries, do-not-touch map, completion verdict |
| [server/auth-local/README.md](../server/auth-local/README.md) | Local auth module map |
| `server/_core/authOpsMetadata.ts` | How to emit auth ops logs |

## Database / migrations

| Doc | Use when |
|-----|----------|
| [DB_MIGRATION_GOVERNANCE.md](./DB_MIGRATION_GOVERNANCE.md) | Official migrate workflow |
| [MIGRATION_STAGING_CHECKLIST.md](./MIGRATION_STAGING_CHECKLIST.md) | Pre-staging gate |

## Assessment / history

| Doc | Use when |
|-----|----------|
| [AUTH2_DEEP_ENGINEERING_ASSESSMENT.md](./AUTH2_DEEP_ENGINEERING_ASSESSMENT.md) | Full engineering review snapshot |

## Code entry points

| Path | Role |
|------|------|
| `server/auth-local.ts` | Local auth routes |
| `server/_core/sdk.ts` | JWT session (`authenticateRequest`) |
| `server/_core/cookies.ts` | Session cookie policy |
| `server/_core/index.ts` | Server wiring |
