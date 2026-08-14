# OWNER-API.md

tRPC router: `ownerAccess` (`protectedProcedure` + `assertPlatformOwner`).

| Procedure | Role |
|-----------|------|
| `ownerAccess.getMode` | Current mode + Live Plan targets |
| `ownerAccess.setMode` | FULL_PLATFORM or SIMULATED_PLAN |
| `ownerAccess.setSimulation` | SIMULATED_PLAN for a catalog code |
| `ownerAccess.returnToFullPlatform` | Explicit return |

Non-owner admin, customer, staff, and unauthenticated callers receive `FORBIDDEN` / `UNAUTHORIZED`.

Audit event: `OPS_EVENT.owner_access_mode_changed` with owner prefix, previous/new mode, simulated plan, timestamp, correlation ID. No passwords, tokens, or secrets.
