# AUTH2 — Closure & Final Boundary Audit (D.7)

**Status:** AUTH2 is **complete**. Further auth work should be **incident-driven** or a **future AUTH3 architecture phase**, not continuous refactor.

**Date context:** Post slices D.1–D.6 (maintainability, token semantics, ops metadata, auth-local boundaries, operator ergonomics, deployment validation).

---

## 1. Executive closure summary

MineuQR authentication is **operationally mature** for a stateless JWT + cookie SaaS:

| Capability | State |
|------------|--------|
| Local login / change-password | Stable |
| Password reset + email verification | Stable, non-enumerating |
| OAuth (Manus) callback | Stable with abuse guards |
| Session TTL + revocation (`sessionValidAfter`, `passwordChangedAt`) | Stable |
| Rate limits + burst visibility | Stable (in-memory) |
| Deployment proxy/TLS awareness | Validated (D.6) |
| Operator docs | `auth-ops-signals.md`, `deployment-auth-readiness.md` |

**Verdict:** Safe to **stop routine auth refactoring** and move product/engineering focus elsewhere. Touch auth only for bugs, security incidents, or deliberate AUTH3 planning.

---

## 2. Boundary map (who owns what)

```
┌─────────────────────────────────────────────────────────────────┐
│  HTTP entry                                                      │
│  server/_core/index.ts → trust proxy, deploymentGuards, routes   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
     ┌──────────────────────┼──────────────────────┐
     ▼                      ▼                      ▼
 auth-local.ts          oauth.ts              sdk.ts + cookies.ts
 (route orchestration)  (OAuth routes)        (JWT session cookie)
     │                      │                      │
     ▼                      │                      │
 auth-local/*               │                      │
 (helpers only)             │                      │
     │                      └──────────┬───────────┘
     ▼                                 ▼
 authOneTimeToken*              secureRequest.ts
 (reset/verify tokens)          (HTTPS / x-forwarded-proto)
     │                                 │
     ▼                                 ▼
 db auth_tokens                   deploymentGuards.ts
                                       (prod TLS/CSRF visibility)
     │
     ▼
 authOpsMetadata.ts + authOpsSignalGuide.ts
 (emit shape + operator reference)
     │
     ▼
 authAudit / sessionAudit / suspiciousActivity
 (login audit + cooldowned aggregates)
```

### Module responsibilities

| Module | Owns | Does **not** own |
|--------|------|------------------|
| `auth-local.ts` | Route sequencing, DB/email orchestration | Cookie flags, JWT signing |
| `auth-local/*` | Pure/local helpers, in-memory resend + invalid-token maps | OAuth, tRPC auth |
| `authOneTimeToken.ts` | Token classify/issue/TTL constants | HTTP responses |
| `authOneTimeTokenResponses.ts` | Stable user-facing error strings | Ops events |
| `authTokenUtils.ts` | `newToken`, `tokenToHash` | Storage, expiry |
| `authOpsMetadata.ts` | `authOpsLog`, metadata builders | Event names |
| `authOpsSignalGuide.ts` | Documentation-only event meanings | Runtime |
| `secureRequest.ts` | TLS/proxy detection | Cookie SameSite policy |
| `cookies.ts` | Session cookie attributes | Token creation |
| `deploymentGuards.ts` | Prod TLS/CSRF **visibility** (optional enforce) | Login logic |
| `deploymentReadiness.ts` | Startup deployment assessment | Per-request logic |
| `sessionConfig.ts` | Session TTL constants | Revocation DB writes |
| `sdk.ts` | JWT create/verify, `authenticateRequest` | Local password |
| `oauth.ts` | OAuth callback + invalid burst | Local auth |
| `authAudit.ts` | Login fail/success, rate-limit ops | Session anomalies |
| `sessionAudit.ts` | Session anomaly cooldowned ops | Login |
| `suspiciousActivity.ts` | Cross-signal threshold bursts | Enforcement |
| `cooldownCounterMap.ts` / `emitCooldown.ts` | Shared counter primitives | Business rules |

### Sensitive boundaries (do not blur)

1. **Cookie policy** — only `cookies.ts` (+ `secureRequest` input).
2. **JWT claims / session validity** — only `sdk.ts` + `sessionConfig.ts` + DB revocation fields.
3. **Ops event names** — only `opsTaxonomy.ts` (renames break dashboards).
4. **Non-enumerating auth responses** — route handlers in `auth-local.ts` (product/security contract).

---

## 3. “DO NOT TOUCH YET” map

| Zone | Why leave it | Future phase |
|------|----------------|--------------|
| `auth-local.ts` route orchestration | High regression risk; tests are partial | AUTH3: split by route **after** integration tests |
| `authAudit` `legacyPrefix`/`legacyType` | Console format compatibility | MON: migrate dashboards off legacy lines |
| Duplicate counter patterns (`sessionAudit`, `suspiciousActivity`, `deploymentGuards`) | Works; shared primitives exist for new code only | Unify only with characterization tests |
| OAuth `state` decode (`_safeDecodeOAuthState` vs SDK) | Subtle redirect semantics | Dedicated OAuth hardening slice |
| `local-uploads.getPublicBaseUrl` vs `secureRequest` | Non-auth domain; separate proto logic | Uploads refactor (not AUTH2) |
| Drizzle migration history / `sessionValidAfter` patch scripts | Governance debt; DB-specific | Infra/migrations project |
| tRPC `auth.me` / client redirect flows | Frontend coupling | Client auth slice |
| Redis / external rate-limit store | Architectural change | Scale phase |
| Refresh tokens / session store | Architectural change | AUTH3 |
| `isSecureRequest` in multiple consumers | Centralized in `secureRequest.ts` — **do not re-inline** | — |

---

## 4. Intentionally deferred (known debt)

| Item | Risk if rushed | Acceptance |
|------|----------------|------------|
| Full `auth-local` integration test suite | False confidence | Add per-route tests when touching routes |
| Unify all burst counters on `cooldownCounterMap` | Emit threshold drift | New code uses shared helpers |
| `PUBLIC_APP_URL` in all link builders (uploads, etc.) | Scope creep | Auth email links covered |
| CSRF enforce by default | May break legitimate clients | Opt-in `CSRF_ORIGIN_ENFORCE=1` |
| Session rotation / refresh | Product + security design | Not required for current SaaS stage |
| OAuth state unified with SDK | Redirect URI regressions | Documented duplicate |

---

## 5. Production maintainability verdict

| Criterion | Rating | Notes |
|-----------|--------|-------|
| Contributor clarity | **Good** | `auth-local/README`, ops + deployment docs |
| Operational debugging | **Good** | `AUTH_OPS_SIGNAL_GUIDE`, cid/ip on auth ops |
| Incident ergonomics | **Good** | Abuse vs degraded classification documented |
| Boundary stability | **Good** | D.4 split is sufficient; stop splitting |
| Test coverage | **Fair** | change-password, security, guards, tokens; gaps on reset/verify HTTP |
| Evolution readiness | **Good** | Clear extension points without framework churn |

---

## 6. Deployment readiness verdict

| Check | Status |
|-------|--------|
| Trust proxy + `secureRequest` | Documented + startup log |
| Cookie `SameSite`/`Secure` policy | Documented |
| `PUBLIC_APP_URL` for email links | Optional env supported |
| Staging ops events | `deployment_*`, `csrf_*` documented |

**Staging confidence:** **High** for auth, assuming proxy sends `x-forwarded-proto: https` and env vars from [deployment-auth-readiness.md](./deployment-auth-readiness.md) are set.

---

## 7. Remaining auth risks (honest)

| Risk | Severity | Mitigation today |
|------|----------|------------------|
| In-memory rate limits / counters (multi-instance) | Medium at scale | Accept for current scale; document |
| Partial HTTP test coverage on reset/verify | Low–medium | Manual staging checklist |
| Stolen session cookie (no rotation) | Medium | TTL + revocation + short prod TTL |
| Migration governance (drizzle) | Ops | Patch scripts; not auth-logic |
| Origin/Host mismatch on staging preview URLs | Low | `PUBLIC_APP_URL`, CSRF logs |

None block **staging** or **closing AUTH2**.

---

## 8. AUTH2 slice ledger (completed)

| Slice | Outcome |
|-------|---------|
| D.1 | Shared cooldown + token utils |
| D.2 | One-time token semantics |
| D.3 | Ops metadata consistency |
| D.4 | `auth-local/*` helper boundaries |
| D.5 | Operator cookbook + signal guide |
| D.6 | `secureRequest`, deployment readiness, `PUBLIC_APP_URL` |
| D.7 | This closure audit |

Prior AUTH2 (A–C): sessions, deployment guards, OAuth abuse, revocation, TTL, assessments.

---

## 9. Final AUTH2 completion verdict

**AUTH2 is officially complete.**

- Runtime auth behavior is **stable** and **intentionally preserved**.
- Boundaries are **documented** and **maintainable**.
- Deployment assumptions are **validated** for staging.
- Remaining debt is **catalogued**, not hidden.

**Recommended next engineering focus:** product features, staging smoke tests, migration governance (separate track)—**not** auth refactor momentum.

---

## Quick links

- [AUTH2 index](./AUTH2_INDEX.md)
- [Auth ops signals](./auth-ops-signals.md)
- [Deployment auth readiness](./deployment-auth-readiness.md)
- [Deep engineering assessment](./AUTH2_DEEP_ENGINEERING_ASSESSMENT.md)
- [auth-local README](../server/auth-local/README.md)
