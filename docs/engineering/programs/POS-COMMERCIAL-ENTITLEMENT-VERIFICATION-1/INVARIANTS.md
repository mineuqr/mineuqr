# INVARIANTS

1. Commercial ownership stays in Catalog → Projection → Subscription Runtime → Live Plan → `checkLimit` / `requireFeature`. POS only consumes.  
2. POS quantity key is `posTerminals`. It is a **limit**, not a Projection feature. Do not auto-create a POS feature key from POS.  
3. Missing customer `posTerminals` fail-closes to 0. ADMIN / isAdmin is unlimited unless the key is explicit.  
4. `devices` is never POS quantity.  
5. `checkLimit` `ownerId` is `restaurant.userId`.  
6. Provisioning that consumes a slot calls `assertProvisioningAllowed` (`proposedTotal = provisioned + 1`).  
7. Operational POS commands deny when Effective Entitlement `available` is false (`entitlement_unavailable`).  
8. Owner, restaurant `role=admin`, and PLATFORM_OWNER are not cashiers without explicit POS grants.  
9. RBAC / admin / owner role is not a commercial grant (CE-05).  
10. No POS subscription, billing, plan, or entitlement tables.  
11. No POS-owned Order transaction; commercial gating must not wrap or replace Order `db.transaction`.  
12. Commercial gating is not a financial aggregate (Order / Check / Settlement / Register / Shift / CRMP / Reporting stay owners).  
13. Fail-closed: unavailable commercial or limit state does not allow POS-use mutations.  
14. In-memory POS stores remain test-only in production composition.  
15. Plan downgrade does not auto-delete terminals; new slots follow current cap. Excess freeze is not a POS-invented policy.  
16. Concurrent `checkLimit` then insert can exceed cap; occupancy atomicity belongs to shared Commercial, not a POS lock.
