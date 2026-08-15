# RESTAURANT-QUOTA-ENFORCEMENT.md

## Order

```
Authentication
  ↓
Account / Tenant Authorization
  ↓
Commercial Account State (FROZEN → deny)
  ↓
Commercial Entitlement (hub)
  ↓
Restaurant Limit (checkLimit restaurants)
  ↓
Persistence
```

`restaurant.create` (`server/routers.ts`):

1. Resolve `ownerUserId` (admin may create for another owner; customer creates for self).
2. `await assertRestaurantCreateAllowed(ownerUserId)` — **always**, including customer admin.
3. Persist.

The previous skip:

```
if (ctx.user.role !== "admin") {
  await assertRestaurantCreateAllowed(...)
}
```

is removed. Customer Admin is not a commercial grant.

## ACTIVE customer

| Condition | Result |
|-----------|--------|
| `currentCount + 1 <= cap` | ALLOW |
| `currentCount + 1 > cap` | DENY (`FORBIDDEN`) |
| `cap === null` | ALLOW (Unlimited) |

Examples with **current** production values (editable later):

| Plan | Current cap | 0 existing | at cap |
|------|-------------|------------|--------|
| Basic | 1 | first allowed | second denied |
| Professional | 5 | 0–4 allowed | sixth denied |
| Enterprise | `null` | no numeric quota denial | — |

After an administrator changes Professional `5 → 10`, the same path uses `10` once caches are invalidated. No code change.

## Owner of the quota

Quota is evaluated for the **restaurant owner**, not the actor’s role.

Platform Owner creating a restaurant for a customer enforces **that customer’s** Live Plan limit.
