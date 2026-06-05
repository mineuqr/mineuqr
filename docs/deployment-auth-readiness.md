# Deployment auth readiness

Pre-staging checklist for MineuQR session cookies, proxy headers, and local auth. Runtime auth logic is unchanged unless `PUBLIC_APP_URL` is set (optional link base override).

## Startup signals

On boot in **production**, one line is logged:

```text
[AuthDeploy] readiness env=production trustProxy=… appId=… publicAppUrl=…
```

Set `AUTH_DEPLOY_DEBUG=1` for full JSON report and all notes.

## Environment variables

| Variable | Purpose |
|----------|---------|
| `NODE_ENV=production` | Enables production cookie policy + deployment guards |
| `JWT_SECRET` | ≥32 chars (required in production; startup throws if weak) |
| `VITE_APP_ID` | JWT `appId` claim (required in production) |
| `TRUST_PROXY=1` | Explicit reverse-proxy trust (production also enables by default) |
| `PUBLIC_APP_URL` | Optional canonical origin for reset/verify email links (e.g. `https://staging.mineuqr.com`) |
| `CSRF_ORIGIN_ENFORCE=1` | Block sensitive auth POST when Origin ≠ Host (default: log only) |
| `AUTH_DEPLOY_DEBUG=1` | Verbose deployment diagnostics |
| `AUTH_DEBUG=1` | Per-request auth debug (separate from deploy) |

## Cookie policy (session)

| Context | SameSite | Secure | Notes |
|---------|----------|--------|-------|
| Local HTTP (`localhost`, etc.) | `lax` | `false` | Dev-friendly |
| HTTPS or `x-forwarded-proto: https` | `none` | `true` | Cross-site SPA + API on same registrable domain |

**Requires:** `app.set("trust proxy", 1)` in production (automatic via `shouldTrustProxy()`).

**Safari / mobile:** `SameSite=None` requires `Secure`; misconfigured proxies that omit `x-forwarded-proto` cause login cookies to be set as non-secure HTTP.

## Proxy / TLS checklist

- [ ] TLS terminates at load balancer → app receives `x-forwarded-proto: https`
- [ ] `Host` matches public site hostname
- [ ] SPA `Origin` on auth POST matches `Host` (or set `CSRF_ORIGIN_ENFORCE=1` after verifying)
- [ ] `PUBLIC_APP_URL` set if forgot-password runs server-side without browser `Origin` (e.g. API-only triggers)

## Ops events to watch (staging)

| Event | Meaning |
|-------|---------|
| `deployment_insecure_http_in_production` | App thinks request is HTTP in production |
| `deployment_forwarded_proto_missing` | No `x-forwarded-proto` behind proxy |
| `csrf_origin_mismatch` | Origin host ≠ request host on auth POST |
| `session_appid_mismatch` | `VITE_APP_ID` ≠ token `appId` |

See [auth-ops-signals.md](./auth-ops-signals.md) for full AUTH telemetry.

## Code map

| Module | Role |
|--------|------|
| `server/_core/secureRequest.ts` | Shared HTTPS / forwarded-proto detection |
| `server/_core/cookies.ts` | Session cookie flags |
| `server/_core/deploymentGuards.ts` | Production TLS + CSRF visibility |
| `server/_core/deploymentReadiness.ts` | Startup assessment |
| `server/auth-local/httpHelpers.ts` | Email link base URL |

## Local vs staging parity

| Area | Local dev | Staging/production |
|------|-----------|-------------------|
| Cookies | `lax` / non-secure on HTTP | `none` / secure on HTTPS |
| Deployment guards | Disabled | Active |
| Email links | Often `Origin` from Vite | Use `PUBLIC_APP_URL` if needed |
| Trust proxy | Off unless `TRUST_PROXY=1` | On in production |
