# MineuQR AUTH2 Deep Engineering Assessment
Post AUTH2-B + AUTH2-C Slice 1–2 Review  
Architecture philosophy: **Stabilize → Observe → Harden → Expand**  
Constraints: **no auth rewrite**, **no Redis**, **no premature microservices**, **low-blast incremental engineering only**

> **Historical snapshot:** Written when Manus OAuth was still in the auth path. OAuth routes and `server/_core/oauth.ts` were removed in a later exit; production auth is **local email/password + JWT session only**. OAuth-related findings below describe the pre-removal architecture.

Scope baseline (as observed in repo):
- **Session model**: stateless **HS256 JWT** stored in `app_session_id` cookie, validated on every request (no server-side session store).
- **Session payload**: `{ openId, appId, name, iat, exp }` signed with `ENV.cookieSecret` (`JWT_SECRET`).
- **User binding**: session is bound to `ENV.appId` and mapped to DB user by `openId`, with auto-sync from OAuth provider if missing.
- **Local auth**: `/api/auth/login` (email+password) for `local_` accounts; password reset + email verification use **DB-backed hashed tokens**.
- **Abuse protection**: in-memory rate limiting + cooldowned “suspicious activity” signals; invalid-token and resend amplification suppression are local in-memory maps.
- **Observability**: structured `opsLog` with taxonomy `OPS_EVENT` and correlation IDs (`x-correlation-id`), plus low-noise session anomaly logger.

---

## 1. Executive Engineering Summary

### What’s already strong
- **Clear auth boundary**: one canonical cookie (`app_session_id`) with consistent verification flow (`sdk.authenticateRequest`) and a single tRPC context entrypoint that safely degrades to unauthenticated.
- **App/tenant boundary hardening**: session includes `appId` and is rejected if it doesn’t match `ENV.appId` (prevents cross-environment token reuse).
- **Practical invalidation** (AUTH2-B): password changes invalidate old sessions via `passwordChangedAt` vs JWT `iat`.
- **Cookie policy discipline**: unified cookie setter (`getSetSessionCookieOptions`) with local-dev lax/unsafe and production none+secure; logout clears multiple variants to avoid “ghost cookies”.
- **Non-enumerating password reset**: `/forgot-password` always returns success when not rate-limited; reset tokens are **hashed at rest** in DB.
- **Observability maturity is trending up**: explicit ops taxonomy, correlation ID propagation, cooldowned session anomaly logs, and threshold-based suspicious-activity aggregation.

### Key architectural weaknesses that remain
- **No server-side session revocation** (by design): beyond password-change invalidation, a stolen session remains valid until expiry (default appears **1 year**).
- **Multi-instance limitations**: rate limits, resend suppression, invalid-token counters, and suspicious-activity tracking are **in-memory**, so effectiveness drops with horizontal scaling or restarts.
- **Proxy / TLS correctness coupling**: secure cookie behavior depends on correct `trust proxy` + `x-forwarded-proto` handling; misconfig risks broken auth or insecure cookies.
- **Some auth endpoint behaviors are only “visibility throttled”**: invalid token brute-force is partially throttled; other flows still do work until threshold.
- **Noise risks**: at least one hot-path debug `console.log` exists in invalid-token counter logic; can flood logs under attack.

### Maturity level (overall)
**Early-production / controlled launch-ready**, assuming single-instance or low-scale, and a deliberate plan to harden session revocation + distributed throttling before serious scaling.

---

## 2. Architecture Maturity Assessment

### Session lifecycle (cookie + JWT)
**Current behavior**
- Session token is a JWT signed with HS256 using `ENV.cookieSecret`.
- Default expiry appears to be **ONE_YEAR_MS**; cookie is set with `maxAge` and token has `exp`.
- Verification occurs per request; failures throw a 403 “Invalid session cookie” and (in tRPC context) trigger cookie clearing only for that explicit case.
- Session contains `appId`; mismatches are treated as invalid.

**Strengths**
- **Stateless simplicity**: no session store; fewer moving parts; consistent with “no Redis / no microservices”.
- **App binding** reduces cross-environment / cross-app replay.
- **Clear ghost-session mitigation**: invalid-cookie errors clear the cookie to break UX loops.
- **Structured anomaly signals** for missing/invalid/appId mismatch/user-sync failures with cooldown.

**Weaknesses / gaps**
- **Long-lived bearer**: a 1-year session JWT is a high-value replay target; without revocation, compromise window is large.
- **No rotation**: no evidence of refresh-token style rotation; session stays static until expiry.
- **No explicit logout invalidation server-side**: logout clears cookie, but cannot invalidate a stolen cookie elsewhere.
- **Inconsistent session verification paths**: some endpoints use `sdk.verifySession` (returns null on invalid) vs `sdk.authenticateRequest` (throws Forbidden). This is fine but increases semantic drift risk.

### JWT lifecycle safety & invalidation correctness
**Current behavior**
- JWT signing uses `jose` (`SignJWT`, `jwtVerify`) with HS256.
- Password-change invalidation uses `user.passwordChangedAt` vs session `iat` (seconds).

**Strengths**
- **Correct invalidation primitive** for password changes (AUTH2-B), low-blast and effective.
- **Config validation**: startup validation fails fast in production if secret is weak/missing or `VITE_APP_ID` missing.

**Weaknesses / gaps**
- **Secret rotation story unclear**: no observable dual-secret verification window or key IDs; rotation may require mass logout.
- **Replay/CSRF surface depends on cookie mode**: `httpOnly` is set; but sameSite policy switches between lax and none depending on TLS/local. CSRF posture depends on how the SPA triggers state-changing actions.

### Cookie consistency & operational stability
**Current behavior**
- Local HTTP: `SameSite=Lax`, `Secure=false`. HTTPS/non-local: `SameSite=None`, `Secure=true`. Always `httpOnly` and `path=/`.
- Logout clears multiple sameSite/secure variants because `clearCookie` requires exact-match options.
- Secure detection uses `req.protocol` and `x-forwarded-proto`; production expects `trust proxy` to be set.

**Strengths**
- **Pragmatic compatibility** across local dev and production.
- **Explicit trust-proxy awareness** and clear-cookie variants reduce production “can’t log out” footguns.

**Weaknesses / gaps**
- **Proxy misconfig is a critical failure mode**: if `x-forwarded-proto` isn’t forwarded or `trust proxy` is wrong, cookies may be set/cleared inconsistently.
- **SameSite=None implies Secure**: correct, but increases dependence on correct TLS termination and forwarding.

### Stale-session handling & boundary stability
**Current behavior**
- Missing cookie emits a **debug** session anomaly (cooldowned) then request is treated unauthenticated or forbidden depending on path.
- Invalid cookie emits **warn** anomaly (cooldowned) and may be cleared in tRPC context.
- If user missing locally, system attempts OAuth sync using `GetUserInfoWithJwt` and upserts user.

**Strengths**
- **Self-healing user sync** reduces “valid session but no user row” incidents.
- **Cooldowned anomaly emission** prevents log storms from bad clients.

**Weaknesses / gaps**
- **OAuth dependency in auth path**: if OAuth provider is degraded, first-time sync may fail and cause a denial; the system logs but does not provide a fallback strategy.

### Architectural maturity level
- **Sessions**: Level **2.5/5** (solid stateless baseline + app binding + password-change invalidation; lacks rotation/revocation/distributed controls).
- **Cookies**: Level **3/5** (well-thought compatibility; needs stronger deployment guardrails).
- **Operational discipline**: Level **3/5** (taxonomy + correlation IDs + cooldowned signals; needs tighter noise control + dashboards/runbooks).

---

## 3. Abuse Protection Assessment

### Protections observed
- **Login brute-force**: in-memory rate limit per **IP+email**: 10 attempts / 15 minutes (`LOGIN_RATE_LIMIT`). Cleared on successful login.
- **Auth endpoint burst**: in-memory rate limit per **IP**: 30/min (`AUTH_BURST_LIMIT`) on key auth endpoints (e.g. login, forgot-password).
- **Password reset request**: non-enumerating response + per-key limit (5 / 10 minutes) keyed as `pwdreset:login:ip:email`.
- **Invalid token throttling (reset/verify)**: per-IP counters, window 10 minutes, threshold 25; emits cooldowned ops events and may short-circuit work at/over threshold.
- **Verification resend**:
  - Rolling-window limits: actor 5 / 10 minutes; IP 15 / 10 minutes.
  - Per-actor minimum email interval: 60 seconds suppression to reduce amplification.
  - Cooldowned ops emissions for bursts/amplification suspicion.
- **Suspicious activity aggregation**: threshold-based ops events keyed by actor or IP with cooldown (visibility only, no blocking).

### Effectiveness (single instance / low scale)
- **Good baseline** against casual brute-force and accidental resend storms.
- **Well-chosen semantics**: success-preserving throttles for verification resend and forgot-password reduce user-visible disruption and account enumeration.
- **Correct “don’t punish success”** behavior for login (clearing bucket on success).

### False-positive risk
- **Moderate** for shared IP environments (cafes/corporate NAT), because:
  - Login key couples **IP+email** (good), but burst key is **IP-only** (can rate-limit unrelated users behind same NAT).
  - Verification resend uses both actor and IP (safer), but IP limit can still trip for shared networks.

### Operational safety
- **Mostly safe**: throttles tend to return user-friendly 429s (login) or preserve success semantics (verification resend).
- **Noise risk under attack**: invalid-token counter currently logs a raw `console.log({ ... })` per attempt which can become a log DoS vector.

### Scaling limitations
- **High**: all throttles and trackers are **in-memory**. Under multi-instance:
  - Attackers can round-robin instances to multiply effective limits.
  - Restart resets counters, enabling “burst after deploy”.
  - Incidents are harder to analyze without centralized counters.

### Remaining abuse vectors
- **Credential stuffing** distributed across IPs (botnets): current limits are largely IP-based; actor-based only exists after authentication.
- **Session cookie replay**: abuse controls don’t meaningfully protect against stolen session cookies.
- **Email amplification**: improved, but still depends on single-instance stamps; multi-instance can re-enable spam.

---

## 4. Operational Readiness Assessment

### Ops taxonomy quality
- **Strong for this stage**: `OPS_EVENT` has stable snake_case types, and events carry category + severity + metadata.
- **Legacy compatibility handled**: logger strips legacy keys from visible payload while keeping message usability.

### Auth signal usefulness
- **High-value signals present**:
  - session anomalies: missing / invalid / appId mismatch / user sync failures
  - failed login reasons (rate_limited, user_not_found, no_password, invalid_credentials)
  - rate-limit exceeded
  - token invalid bursts / bruteforce suspicion
  - resend burst / email amplification suspicion
  - oauth callback errors / provider misconfiguration

### Noise levels
- **Generally controlled** via cooldowns, but:
  - session “cookie missing” is debug (good), still emitted on cooldown per IP.
  - invalid token attempts have a raw `console.log` that is likely too noisy for production under abuse.

### Correlation propagation
- Correlation ID middleware supports incoming `x-correlation-id` (validated) and echoes `X-Correlation-Id` back.
- Auth events capture correlation ID when present; tRPC context surfaces `correlationId`.

### Incident-debug readiness
- **Moderate**:
  - You can trace a request via correlation ID across auth logs.
  - You can see anomaly aggregation via suspicious activity tracker.
  - But there is no evidence (in this slice) of persistent counters, dashboards, or runbooks.

### Blind spots / missing diagnostics
- **Session verification outcomes** by endpoint (pass/fail rates, appId mismatch counts) are logs-only; no metrics aggregation.
- **Proxy misconfig detection**: no explicit startup/healthcheck asserting `trust proxy` and secure-cookie behavior matches deployment topology.
- **Distributed behavior**: no multi-instance awareness for throttles (hard to diagnose “why did it allow?”).

---

## 5. Security Risk Matrix

| Risk | Level | What could happen | Evidence/Current state | Recommended hardening (low-blast) |
|---|---:|---|---|---|
| **Stolen session cookie replay (no revocation)** | **Critical** | Attacker keeps access until JWT expiry; logout doesn’t help | Stateless cookie JWT; no server-side session store; 1-year maxAge/exp | Add lightweight revocation: e.g. `sessionValidAfter` per user (already have `passwordChangedAt` pattern) or `sessionVersion` claim; shorten session TTL; consider periodic rotation |
| **Long-lived session lifetime** | **High** | Larger compromise window; compliance concerns | `ONE_YEAR_MS` default | Reduce TTL for production (e.g. weeks) + optional “remember me”; add idle timeout semantics if feasible |
| **Multi-instance abuse controls bypass** | **High** | Rate limits/resend suppression weakened; spam/bruteforce easier | In-memory `Map` stores for rate limits, resend stamps, invalid-token counters, suspicious signals | Introduce a shared store when scaling (DB-backed counters or a minimal external cache later); until then, explicitly scope launch to single instance / sticky sessions |
| **Proxy/TLS misconfiguration affecting cookie security** | **High** | Cookies set insecurely or logout fails; auth flakiness | Secure detection uses `x-forwarded-proto`; clearing depends on matching flags; trust proxy required | Add deployment check and health signal; enforce `trust proxy` in production; add alerting on unexpected secure=false in production |
| **CSRF exposure when `SameSite=None`** | **High** (contextual) | If state-changing endpoints accept cookie auth without CSRF protection, cross-site requests may succeed | Cookie is `SameSite=None` in HTTPS mode; CSRF protections not visible in examined slice | Ensure CSRF strategy for cookie-auth endpoints (SameSite=Lax where possible; CSRF token; origin checks) especially for non-tRPC endpoints |
| **Auth endpoint log amplification (log DoS)** | **Medium** | Attackers generate high log volume/cost | `console.log` per invalid token attempt | Remove or gate behind debug flag; rely on cooldowned ops events only |
| **OAuth provider dependency during user sync** | **Medium** | Valid sessions fail during provider outage for users not in local DB | Auto-sync on missing user; failure throws Forbidden | Cache/snapshot essential user fields; degrade to “unauthenticated but don’t break everything” where safe; add clearer ops events + fallback behavior |
| **Secret rotation difficulty** | **Medium** | Forced mass logout or downtime during key rotation | Single secret used for signing/verifying | Add dual-key verification window (kid-based) when needed; document rotation runbook |
| **Timing consistency (login)** | **Acceptable/Postponed** | Potential user enumeration via timing differences | Login returns generic auth error for most failures, but code paths differ | Usually acceptable early; if targeted, add constant-time-ish response shaping and uniform delays |
| **Local vs production divergence** | **Acceptable/Postponed** | Local lax/unsafe differs from prod none/secure; bugs appear late | Explicit local vs secure branches | Mitigate with an HTTPS local mode or staging env; document expected differences |

---

## 6. Technical Debt Matrix

| Area | Debt type | Severity | Why it matters | Cleanup candidate (low-blast) |
|---|---|---:|---|---|
| In-memory rate limiting (`rateLimit.ts`) | Postponed (by constraints) | **High** | Doesn’t scale horizontally; resets on restart | If staying “no Redis”, consider DB-backed counters (coarse) or “single instance only” policy + clear docs |
| In-memory invalid-token + resend suppression maps (`auth-local.ts`) | Dangerous | **High** | Attackers can bypass via multi-instance; memory pressure under abuse | Consolidate into shared limiter utility; cap keys consistently; remove per-attempt logs; consider DB-backed counters for high-risk endpoints |
| Session revocation beyond password-change | Dangerous | **High** | No response to session theft beyond TTL | Extend `passwordChangedAt` pattern to a general `sessionValidAfter` or `sessionVersion` increment on logout/security events |
| Mixed auth semantics (`verifySession` null vs `authenticateRequest` throw) | Acceptable | Medium | Semantic drift risk; inconsistent endpoint behaviors | Document guidelines: which endpoints must throw vs return null; unify helper wrappers |
| Proxy/cookie correctness relies on deployment config | Dangerous | Medium | Misconfig breaks auth or security silently | Add explicit startup assertions + ops events; document reverse-proxy requirements |
| Ops events are logs-only (no metrics) | Postponed | Medium | Harder to trend/alert | Introduce minimal counters (even in-process) exported to your preferred monitoring later |
| “Success-preserving” throttles that still do work | Acceptable | Medium | Under heavy abuse, still consumes CPU/DB | Add early exits when throttled; ensure throttled paths avoid DB writes/emails |
| OAuth user sync inside auth path | Acceptable | Medium | Provider dependency on critical path | Prefer async backfill where possible; cache last-known user info locally |

---

## 7. Recommended Priority Order

### Recommendation on AUTH2-C Slice 3
**Keep AUTH2-C Slice 3 next**, but adjust emphasis: prioritize **session safety + distributed-ready abuse controls** over adding new surface area.

### Proposed execution order (low-blast slices)
1. **Session replay window reduction**
   - Reduce production session TTL from 1y to a more conservative value.
   - Add a “remember me” toggle only if needed; keep default short.
2. **Session revocation primitive**
   - Generalize existing password-change invalidation into a reusable revocation mechanism (e.g., `sessionValidAfter` or `sessionVersion` claim checked against DB).
   - Hook into logout, password reset completion, admin forced logout, and suspicious-activity escalations.
3. **Harden abuse controls for multi-instance readiness**
   - Keep in-memory for now, but shape code so it can swap to DB-backed counters with minimal change.
   - Remove noisy per-attempt logs; rely on cooldowned ops events.
4. **Deployment guardrails**
   - Add explicit checks/ops events for `trust proxy` and secure-cookie expectations in production.
5. **CSRF posture review for cookie-auth endpoints**
   - Document and enforce origin/CSRF requirements for all cookie-authenticated HTTP endpoints.
6. **Observability tightening**
   - Define “auth incident” runbook queries: top ops events, correlation ID tracing steps, and expected baselines.

---

## 8. Production Readiness Verdict

### Verdict
**Stable enough for a controlled production launch** under these conditions:
- **Single instance** (or sticky sessions) and modest traffic.
- Strong `JWT_SECRET` and correct `VITE_APP_ID`.
- Correct proxy/TLS configuration (`trust proxy` aligned with `x-forwarded-proto`).

### What’s already “good enough”
- Auth boundary stability and session verification flow.
- Password-change invalidation (meaningful safety improvement).
- Non-enumerating password reset with hashed tokens.
- Baseline brute-force throttling and resend amplification suppression.
- Structured ops taxonomy + correlation ID + cooldowned anomaly logs.

### What must be hardened before serious scaling
- Session revocation/rotation strategy and shorter TTLs.
- Shared/distributed abuse counters (or explicit operational constraint to remain single-instance).
- Proxy/cookie correctness guardrails and CSRF posture verification.

---

## 9. Critical Warnings

1. **Session replay remains the dominant risk**: without a revocation mechanism, a stolen `app_session_id` can persist until expiry (currently appears long-lived).
2. **In-memory abuse controls don’t scale**: once you run multiple instances, your effective rate limits and resend suppression weaken significantly.
3. **Proxy misconfiguration can silently break security**: cookie secure/samesite behavior depends on correct forwarding and `trust proxy`.
4. **Log amplification under attack**: remove/gate any per-attempt logging on invalid-token paths to avoid operational overload.

---

## 10. Safe-to-Postpone Areas

These are reasonable to defer (given current constraints and stage) if you accept the launch guardrails above:
- **Full microservice-style auth separation** (explicitly out of scope).
- **Redis-backed global rate limiting** (explicitly out of scope), provided you remain single-instance or accept weaker enforcement.
- **Advanced OAuth hardening** (PKCE enforcement details, provider token introspection), assuming provider is trusted and integration scope is stable.
- **Sophisticated timing equalization** for login failures (nice-to-have; current behavior is broadly non-enumerating).
- **Metrics instrumentation** beyond logs (as long as ops logs remain queryable and low-noise).

