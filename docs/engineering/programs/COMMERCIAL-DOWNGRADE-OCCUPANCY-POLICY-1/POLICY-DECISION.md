# POLICY DECISION

**Program:** COMMERCIAL-DOWNGRADE-OCCUPANCY-POLICY-1  

## Decision

**OPTION B.**

A plan downgrade does not mutate existing resources. Existing occupancy may exceed the new effective cap. New capacity-consuming mutations are rejected when:

```
proposedTotal = occupancy + occupancyDelta
occupancyDelta = 1
proposedTotal > effectiveCap
```

→ `CommercialLimitExceededError` / G-06 `FORBIDDEN`.

Non-increasing mutations (`occupancyDelta = 0`) are not new capacity. A hard `limit_exceeded` on `proposedTotal === occupancy` does not block them. `NONE` / unsupported / denied still fail closed.

## Why this is not invented

- Cap remains `checkLimit()`.
- Occupancy remains domain `COUNT(*)`.
- Bind/saveLive already leave tenant rows untouched.
- G-10 occupancy sets are unchanged.
- G-09: capacity belongs to the tenant resource, not caller role.
- Create-after-downgrade already failed closed before this program.
- The only code change interprets certified `occupancyDelta = 0` against Policy B.

## Explicitly not selected

| Option | Why not |
|--------|---------|
| A freeze | No product freeze requirement; would invent operational lockout |
| C auto-deactivate | Catalog inactive still occupies (G-10); POS surprise |
| D auto-delete | Destructive; no requirement |
| E grace | No requirement; would add grace state |
| F add-on conversion | Future billing scope |
| G per-class downgrade engine | Occupancy-set difference is G-10, not a second downgrade system |

## Owner / Admin / PLATFORM_OWNER

Same Commercial policy. PLATFORM_OWNER remains G-09 **B** (target tenant cap). FULL_PLATFORM unlimited is entitlement, not a role bypass.

## Implementation

Smallest helper clarification: `isNewCapacityDenial`. No migration. No debt table. No freeze flag.
