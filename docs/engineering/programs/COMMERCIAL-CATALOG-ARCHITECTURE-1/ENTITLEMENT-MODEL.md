# ENTITLEMENT-MODEL.md

```
Live Plan (definition)
  ↓
Entitlement resolution  (dynamic; optional short cache)
  ↓
Account entitlement result  (plan, features, limits, account state)
  ↓
CanUse(account, capability) / checkLimit(account, limitKey, proposedTotal)
```

## Resolution style

**Hybrid dynamic:** resolve from current Live Plan + subscription + account state at decision time. Cache is invalidation-only, not a contractual snapshot. Versioned entitlement snapshots stay **retired**.

Owner: `resolveOwnerEntitlements` / `getCommercialEntitlements`.  
Enforcement: `requireFeature` / `hasFeature` / `checkLimit` / Frozen middleware.

## CanUse (canonical server decision)

```
CanUse(account, capability) =
  Owner FULL_PLATFORM → true (via owner entitlement path only)
  ELSE account state ≠ ACTIVE → false
  ELSE capability in current Live Plan composition AND hub feature true
```

UI `hasFeature` is the same question for **presentation**. It is not authorization (CE-08, ADR-ARCH-006).

## Capability classification (current production)

| Class | Keys |
|-------|------|
| **Enforced** | `ordering`, `devices` |
| **Limit-enforced** (not capabilities) | `restaurants`, `categories`, `items` |
| **Account-enforced** | FROZEN prefixes (create/update/delete commercial resources) |
| **Partially / coarse legacy** | templates, customColors, customFonts via `isSubscriptionActive` + admin skip |
| **Presentation-only (flags_only)** | waiter, kiosk, counterPickup, kitchen, register, reporting, settlement children, expo, printing, realtime |
| **Undefined commercially** | hotelMode, roomQr, extra limit vocabulary |

Do not advertise flags_only as enforced.

## Limit contract (no repair in this program)

```
Limit definition (Live Plan, key, null=unlimited, 0=none allowed)
  → usage metric (count of owner restaurants / restaurant categories / items)
  → proposedTotal
  → checkLimit before persist
```

| Topic | Decision |
|-------|----------|
| Ownership | Live Plan limit profile |
| Scope | Account for restaurants; restaurant for categories/items |
| Unlimited | `null` only |
| Zero | Hard deny at first create |
| Enforcement | Server, before persist |
| Concurrency | Fail closed on race (second persist must re-check or unique constraint) — **document; do not implement new locking here** |
| Upgrade | New cap applies immediately after cache invalidation |
| Downgrade | New cap applies immediately; existing excess is not auto-deleted |

## GAP E — Limits on Pricing

**Decision:** Limits are part of the **commercial contract** (how much), not a new capability. Pricing **SHOULD** present the current Live Plan limits for truthfulness.

This is a **presentation** decision, not a Limits-repair or entitlement-model change. Implementation is a later UI program. Not blocking architecture approval of the model.
