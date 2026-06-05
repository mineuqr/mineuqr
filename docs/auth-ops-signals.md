# Auth ops signals — operator cookbook

Lightweight triage guide for MineuQR **AUTH** telemetry. Event names are stable (`OPS_EVENT` in `server/_core/opsTaxonomy.ts`). This doc does not change runtime behavior.

Programmatic mirror: `server/_core/authOpsSignalGuide.ts` (`AUTH_OPS_SIGNAL_GUIDE`).

---

## How logs appear

- **Human mode (default):** `[OPS][AUTH][severity] <event_type> cid=… route=… reason=…`
  - `reason=` on the message line comes from **`metadata.degradedReason`** only.
  - Token/user classifiers live in **`metadata.reason`** (expand the JSON payload).
- **JSON mode:** `OPS_LOG_JSON=1` — full structured event per line.

Every auth route event from `authOpsLog()` includes top-level: `correlationId`, `route`, `method`, `ip`.

---

## Incident triage (5-minute flow)

1. **Pick a correlation id** (`cid=` in message line) or **client IP** (`ip` field).
2. **Classify the event** using the tables below: **abuse** vs **degraded** vs **lifecycle**.
3. **Abuse / noise** — bursts, invalid tokens, rate limits: usually no deploy rollback; confirm thresholds if volume is extreme.
4. **Degraded** — `degradedReason`, `auth_token_create_failed`: check DB, email, env.
5. **Burst metadata** — `countInWindow`, `windowMs`, `threshold`, `key` describe in-memory counters (not blocking enforcement).

---

## Signal groups

### Login (`failed_login`, `rate_limit_exceeded`)

| Event | Severity | Meaning |
|-------|----------|---------|
| `failed_login` | warn | Bad credentials, unknown user, no password, or login rate limit |
| `rate_limit_exceeded` | warn | Rolling limit for `metadata.key` (burst, login email, pwdreset, etc.) |
| `login_success` | info | Debug only (`AUTH_DEBUG=1`) |

**Triage:** Same IP + many `failed_login` → see `suspicious_auth_activity`. Check `metadata.reason` on failed_login payload.

### Session JWT (`session_*`)

Cooldowned aggregates (10m window, 2m emit cooldown) — avoids cookie spam.

| Event | Typical cause |
|-------|----------------|
| `session_cookie_missing` | No `app_session_id` cookie |
| `session_invalid` | Bad/expired JWT |
| `session_appid_mismatch` | Wrong `VITE_APP_ID` vs token |
| `session_user_not_found` | User deleted, cookie still present |
| `session_user_sync_failed` | DB error on user upsert |

**Triage:** `metadata.signal` = anomaly type; `countInWindow` shows volume.

### OAuth (`oauth_*`) — historical

> **Removed:** Manus OAuth callback routes were deleted; local email/password is the only login path. The `oauth_*` event names remain in `opsTaxonomy.ts` for log compatibility — interpret only when reviewing **pre-removal** logs.

| Event | Class | Notes |
|-------|-------|-------|
| `oauth_callback_missing_params` | abuse (info) | Legacy: scanner / broken callback |
| `oauth_state_malformed` | abuse (info) | Legacy: invalid state encoding |
| `oauth_callback_invalid_burst` | abuse (warn) | Legacy: ≥25 invalid attempts / 10m per IP+reason |
| `oauth_callback_rate_limited` | abuse | Legacy: hard 429 at 60/min per IP |
| `oauth_callback_failed` | degraded | Legacy: handler exception |

### One-time tokens (`password_reset_*`, `email_verification_*`)

| Flow | TTL | User-facing errors |
|------|-----|-------------------|
| Password reset | 30 min | Arabic JSON (`الرابط غير صالح` / `انتهت صلاحية الرابط`) |
| Email verify | 24 h | English plain text on GET (`Invalid token` / `Expired token`) |

**Token metadata `reason` values:** `malformed_token`, `token_missing`, `token_used`, `token_expired`, `user_missing_or_not_local`.

**Forgot-password** always returns `{ success: true }` (non-enumerating).

### Abuse visibility (cooldowned — not enforcement)

| Event | When it fires |
|-------|----------------|
| `auth_invalid_token_burst` | 25th invalid token attempt in window per IP+endpoint |
| `auth_token_bruteforce_suspected` | At/above throttle threshold (same window) |
| `auth_verification_resend_burst` | Resend actor/IP limits exceeded (client still success) |
| `auth_email_amplification_suspected` | Second send within 60s suppressed |
| `suspicious_auth_activity` | Aggregated failed_login / rate_limit threshold |

**Important:** These events are **visibility only**. HTTP responses and rate limits are unchanged by burst ops emission.

---

## Metadata field reference

| Field | Use |
|-------|-----|
| `countInWindow` | Attempts in current rolling window |
| `windowMs` | Window length (usually 600000 = 10 min) |
| `threshold` | Emit or throttle threshold |
| `key` | In-memory counter key (debug dedup) |
| `reason` | Expected failure (token/user/oauth) |
| `issue` | Config/decode classification |
| `degradedReason` | Unexpected handler failure (also in message line) |
| `signal` | Sub-classifier for bursts / suspicious activity |

---

## Local auth code map

| Location | Responsibility |
|----------|----------------|
| `server/auth-local.ts` | Route handlers only |
| `server/auth-local/httpHelpers.ts` | Responses, cookies parse, link base URL |
| `server/auth-local/session.ts` | Session cookie → verified JWT |
| `server/auth-local/rateLimitGuards.ts` | Shared burst / forgot-password limits |
| `server/auth-local/invalidTokenBurst.ts` | Invalid token counter + ops burst |
| `server/auth-local/verificationResend.ts` | Resend limits + email amplification |
| `server/_core/authOneTimeToken.ts` | Token issue/classify/TTL semantics |
| `server/_core/authOpsMetadata.ts` | `authOpsLog`, metadata builders |

**Sensitive (do not change casually):** cooldown windows, thresholds, non-enumerating responses, token TTLs.

---

## Debug env flags

| Variable | Effect |
|----------|--------|
| `AUTH_DEBUG=1` | Extra console + `login_success` ops |
| `OPS_LOG_JSON=1` | JSON lines instead of human `[OPS]` format |
| `OPS_SUSPICIOUS_DEBUG=1` | Lower suspicious-activity thresholds (dev) |
| `CSRF_ORIGIN_ENFORCE=1` | Block CSRF origin mismatch with 403 |

---

## Related docs

- `server/auth-local/README.md` — contributor boundary notes
- [deployment-auth-readiness.md](./deployment-auth-readiness.md) — staging/proxy/cookie checklist
- `docs/AUTH2_DEEP_ENGINEERING_ASSESSMENT.md` — broader auth engineering context
