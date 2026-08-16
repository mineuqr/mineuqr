# ADR-POS-ACCESS-03: POS Permission Enforcement

| Field | Value |
|---|---|
| **Status** | Accepted (program-local) |
| **Program** | POS-TERMINAL-ACCESS-IMPLEMENTATION-1 |
| **Date** | 2026-08-16 |

## Decision

Persist POS grants in `pos_permission_grants` (local migration `0092`, not applied). Owner/admin grant and revoke. Runtime authorization reads only the grant store. Client permission is the required check key, never authority.
