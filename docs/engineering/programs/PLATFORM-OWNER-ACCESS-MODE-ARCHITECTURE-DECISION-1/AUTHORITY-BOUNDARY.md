# AUTHORITY-BOUNDARY.md

## Two authorities

```
PLATFORM_OWNER  →  Platform Access Authority  →  Access Mode
CUSTOMER        →  Subscription → Live Plan → Capabilities
                 (unbound: Legacy Bridge → period → NONE)
```

The Platform Owner **never** enters the customer chain for feature decisions. `600001` is ignored.

## Precedence (approved)

1. **PLATFORM_OWNER + FULL_PLATFORM** → all current commercial capabilities
2. **PLATFORM_OWNER + SIMULATED_PLAN** → current Live Plan for `simulatedPlanCode`  
   If that plan cannot be resolved → **deny** (not Full Platform)
3. **CUSTOMER + bound subscription** → current Live Plan + lifecycle
4. **CUSTOMER + unbound** → Legacy Bridge (period-aware)
5. **NONE**

Revised vs the brief: step 2 does **not** fall through to Full Platform on failure.

## Single decision

All feature gates, quotas (commercial), and UI visibility must call the existing hub after it is extended:

`getCommercialEntitlements` / `resolveOwnerEntitlements`

No scattered `if (isOwner) return true` bypasses.

## Owner identification

**Canonical:** `isPlatformAccountUser(user)` / `ENV.ownerOpenId`.

Do **not** use `userId === 1`.  
Do **not** use `role === "admin"`.  
Do **not** use `accountClassification === "INTERNAL"` as the grant.

| Identity | Access Mode? |
|----------|----------------|
| PLATFORM_OWNER (`ownerOpenId`) | Yes |
| INTERNAL_ADMIN / future ops / QA | No |
| CUSTOMER_ADMIN (`role=admin` on a customer) | No |
| Staff / waiter / cashier / guest | No |

## What owner access must not depend on

Subscription period, status, binding, invoice, payment, checkout, plan version, snapshot, publication, retirement.
