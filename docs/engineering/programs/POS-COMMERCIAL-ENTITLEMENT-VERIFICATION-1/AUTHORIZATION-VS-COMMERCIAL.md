# AUTHORIZATION VS COMMERCIAL

These layers remain separate in the actual POS implementation.

## Definitions (enforced)

| Concern | Question | Mechanism |
|---------|----------|-----------|
| Authentication | Is there a verified user? | `verifiedProcedure` |
| Tenant / restaurant scope | Does this user belong to this restaurant? | `assertRestaurantAccess` (owner/admin) or `assertRestaurantPosScope` (owner / platform admin / any POS grant) |
| Commercial entitlement | Is this **restaurant owner** commercially entitled to POS quantity > 0? | `PosEntitlementService` → `checkLimit(ownerId = restaurant.userId, "posTerminals")` |
| POS access | May this user operate POS at all? | Explicit `POS_ACCESS` grant |
| POS permission | May this user run this command? | Explicit command grant (`SALE_CREATE`, `CHECK_INTAKE`, …) |
| Terminal scope | Is this the restaurant’s active terminal? | `PosAccessService` terminal identity + lifecycle |

## Conceptual order (program)

```
Authenticated User
        ↓
Restaurant Scope
        ↓
Commercial Entitlement
        ↓
POS Access
        ↓
POS Permission
        ↓
POS Terminal
        ↓
Command
```

## Actual evaluate order (`PosAccessService.evaluate`)

1. Terminal exists  
2. Terminal belongs to restaurant (tenant)  
3. Terminal lifecycle is `active`  
4. Effective POS entitlement `available`  
5. Required permission grant  
6. Build `PosAccessContext`

All six concerns are present. They are **not** collapsed into one generic guard. Terminal is checked before commercial for fail-fast identity, which does not replace commercial denial.

## What commercial is not

- Not RBAC  
- Not “owner may cashier”  
- Not “admin may cashier”  
- Not “PLATFORM_OWNER may cashier”  
- Not Operational Device entitlement  

## What authorization is not

- `assertRestaurantAccess` does **not** grant `posTerminals`  
- `users.role === "admin"` is restaurant-scope for platform admin, not a commercial grant and not a cashier grant  
- POS grants do **not** bypass `checkLimit`  

## Constitution CE-04 / CE-05

- Server enforcement exists before persist for POS-use mutations.  
- Owner / admin / staff role does not imply commercial entitlement.  
- PLATFORM_OWNER FULL_PLATFORM is resolved only when `checkLimit`’s `ownerId` is the platform owner (their own hub). Cashier operations on a customer restaurant use **that restaurant’s owner** subscription.
