# PLAN CHANGE OWNERSHIP

**Program:** COMMERCIAL-DOWNGRADE-OCCUPANCY-POLICY-1  

## Authoritative cap source

Effective quantity caps come from Commercial entitlement resolution:

`resolveOwnerEntitlements(ownerId)` → live-plan limits (or fail-closed / legacy bridge) → `checkLimit()`.

Create paths pass `ownerId` / `restaurant.userId` into `checkLimit`. Caller role is not the cap owner (G-09).

## Who may change the plan

| Actor | Mechanism | Owns cap? |
|-------|-----------|-----------|
| Commercial catalog | `saveLive` (limit profile / live plan) | Yes — catalog limits |
| Commercial adoption | `bindSubscriptionToLivePlan` | Yes — tenant binding to a live plan |
| Subscription runtime | `resolveOwnerEntitlements` | Yes — read path |
| POS | none | No |
| Orders | none | No |
| Dashboard / reporting | none | No |
| Restaurant / category / item domain | none | No |

No resource domain stores a plan snapshot for quantity enforcement.

## Bind does not mutate occupancy

`bindSubscriptionToLivePlan` upserts `commercial_subscription_bindings`. It does not delete or deactivate restaurants, categories, items, or POS terminals.

## PLATFORM_OWNER

G-09 **B**: `checkLimit` uses the **target tenant** owner id. FULL_PLATFORM unlimited is an entitlement resolution, not a downgrade bypass.
