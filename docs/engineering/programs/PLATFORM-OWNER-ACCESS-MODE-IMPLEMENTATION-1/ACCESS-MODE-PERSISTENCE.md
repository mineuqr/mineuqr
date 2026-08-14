# ACCESS-MODE-PERSISTENCE.md

Table: `platform_owner_access_mode`

| Column | Role |
|--------|------|
| `ownerOpenId` | PK — canonical owner key |
| `mode` | `FULL_PLATFORM` \| `SIMULATED_PLAN` |
| `simulatedPlanCode` | Live Plan catalog code or NULL |
| `createdAt` / `updatedAt` | timestamps |

CHECK constraint:

- `FULL_PLATFORM` ⇒ `simulatedPlanCode` IS NULL
- `SIMULATED_PLAN` ⇒ `simulatedPlanCode` IS NOT NULL

Absent row ⇒ in-memory default **FULL_PLATFORM**. No auto-insert on entitlement read. No customer subscription or binding is created.

Invalid persisted combinations are **not** normalized to Full Platform. They fail closed.

## Session and multi-device

Mode is account-persisted, not device-local.

- Page reload → same mode
- New authenticated session → same persisted mode
- Device A change → Device B resolves the same row

Authentication expiry does not grant access. Owner identity is re-evaluated on every authenticated request.
