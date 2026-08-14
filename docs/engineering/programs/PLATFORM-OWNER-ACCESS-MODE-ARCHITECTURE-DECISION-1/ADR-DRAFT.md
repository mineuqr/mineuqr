# ADR-DRAFT.md

# ADR: Platform Owner Access Authority

**Status:** Proposed  
**Date:** 2026-08-15  
**Program:** PLATFORM-OWNER-ACCESS-MODE-ARCHITECTURE-DECISION-1

## Context

The Platform Owner (`ENV.ownerOpenId`) is both the control account and, today, a lapsed Professional subscriber (`600001`). Entitlements follow that period and resolve to NONE. Binding or renewing that subscription would make the operator a customer. The owner must operate the platform and must be able to **simulate** a current Live Plan without billing.

## Decision

Establish **Platform Owner Access Authority**, separate from Commercial Subscription Authority.

### Definitions

| Term | Meaning |
|------|---------|
| **Platform Owner** | The single account whose `openId` matches `ENV.ownerOpenId` |
| **Full Platform Access** | All current commercial capabilities; unrestricted commercial quotas; no plan/subscription |
| **Simulated Plan Access** | Consume the **current** Live Plan identified by catalog code |
| **Customer Access** | Subscription → (bound) Live Plan or (unbound) Legacy Bridge |
| **Access Mode** | `FULL_PLATFORM` \| `SIMULATED_PLAN` stored in `platform_owner_access_mode` |

### Precedence

1. PLATFORM_OWNER + FULL_PLATFORM  
2. PLATFORM_OWNER + SIMULATED_PLAN (fail closed if plan unreadable)  
3. CUSTOMER + bound Live Plan  
4. Unbound legacy compatibility  
5. NONE  

### Security

Server-enforced. Only the Platform Owner may change mode. Frontend is not trusted. Future INTERNAL_ADMIN / QA are not Platform Owner.

### Cache isolation

Entitlement cache keys include `kind` + `mode` + `simulatedPlanCode` for the owner. Customers are never keyed with owner mode.

### Billing isolation

No invoice, payment, subscription mutation, or binding. `600001` is not the access authority.

### Live Plan relationship

Simulation reads current Live Plan composition. No snapshot, version, publish, or retire.

### Failure

Unavailable simulated plan: deny, keep mode, require explicit return to Full Platform. Never fail open.

## Consequences

- Owner access is independent of the expired subscription.
- Plan Editor remains the only composition writer.
- Implementation requires a dedicated table (migration in a later program), hub extension, owner-only UI, audit event, and cache-key change.

## Rejected

- Renew/bind/extend `600001`
- `userId === 1` checks
- `role === admin` as Full Platform
- Session-only mode (drops simulation or resets to Full Platform)
- Permanent Full Access only (cannot test customer plans)
- Owner-specific capability matrix
