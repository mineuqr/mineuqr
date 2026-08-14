# SECURITY-MODEL.md

## Server is the authority

The client may **request** a mode change. The server:

1. Authenticates the user
2. Proves `isPlatformAccountUser`
3. Validates mode + plan code
4. Persists the owner-access row
5. Invalidates **that owner’s** entitlement cache (mode-aware keys)
6. Emits `OWNER_ACCESS_MODE_CHANGED`

The client must never send “I am Full Platform” as a trusted entitlement claim. `getCommercialEntitlements` reads server state only.

## Who may call mode mutations

Only the Platform Owner. Reject:

- other `role=admin` users
- INTERNAL users who are not `ownerOpenId`
- restaurant staff, waiters, cashiers, guests
- support / QA / developer roles (future) unless a later ADR grants a **different**, narrower capability

Frontend hiding is insufficient.

## Privilege escalation risks

| Risk | Control |
|------|---------|
| Any admin toggles simulation | Server `isPlatformAccountUser` |
| Failed simulation → Full Platform | Fail closed (FAILURE-MODES) |
| Frontend declares Full Platform | Hub ignores client mode |
| Cache serves Full Platform to a simulating owner | Mode in cache key + invalidate on change |
| Owner acts as another tenant | Existing restaurant access checks unchanged |

## Audit

Event: `OWNER_ACCESS_MODE_CHANGED` (ops taxonomy, category ADMIN, severity info).

Payload: owner userId, previous mode, new mode, previous/new `simulatedPlanCode`, timestamp, correlationId. No secrets, no tokens, no payment data.

Visible in existing ops/audit infrastructure.
