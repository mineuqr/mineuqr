# auth-local — contributor map

Local email/password routes registered as `localAuthRouter` from `server/auth-local.ts`.

**This folder is not a service layer.** It holds stable helpers extracted in AUTH2-D.4. Route orchestration (DB, email, sequencing) stays in `auth-local.ts`.

## Files

| Module | Owns | Do not move here |
|--------|------|------------------|
| `httpHelpers.ts` | Cookie parse, 401/429 responses, link base URL, email normalize | Login logic, token DB |
| `session.ts` | `getVerifiedSessionFromRequest()` | Session TTL, JWT signing |
| `rateLimitGuards.ts` | `enforceAuthBurstLimit`, `enforceForgotPasswordRateLimit` | Limit thresholds (constants.ts) |
| `invalidTokenBurst.ts` | In-memory invalid-token counter + ops burst emit | Token hash/TTL rules |
| `verificationResend.ts` | Resend + amplification in-memory state | Sending email |
| `constants.ts` | Rate-limit numbers shared by helpers | Ops event names |

## Sensitive behavior (production)

- **Non-enumerating** forgot-password and verification resend (always `{ success: true }` when not 429).
- **Invalid token burst** — visibility + soft short-circuit only; thresholds in `constants.ts` + `invalidTokenBurst.ts`.
- **Email amplification** — 60s minimum between verification sends per actor (`verificationResend.ts`).
- **One-time tokens** — semantics in `server/_core/authOneTimeToken.ts` (TTL, classify, issue).

## Ops logging

Use `authOpsLog()` from `server/_core/authOpsMetadata.ts` for AUTH routes so `ip`, `route`, `method`, `correlationId` stay consistent.

Operator reference: `docs/auth-ops-signals.md`.

## Tests

- `server/auth-local.change-password.test.ts` imports `localAuthRouter` from `../auth-local` (parent file).
