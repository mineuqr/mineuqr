# COMMERCIAL POLICY DECISION

**Program:** COMMERCIAL-ADMIN-LIMIT-ENFORCEMENT-1  

## Decision

Commercial quantity capacity belongs to the **tenant resource**, not to the UI surface or caller role.

Owner create, admin create, and any authorized internal create of a quantity-governed resource **consume the same cap** unless an Architecture Authority exemption already exists.

Admin category/item skip was **not** an approved exemption. It was an implementation fork that conflicted with:

- CE-05 (RBAC does not replace commercial entitlement)
- Admin restaurant create (already occupancy-enforced)
- This program’s required invariant: `occupancy <= effective commercial cap`

## Not invented policy

This is the constitution and the occupancy architecture already certified for restaurants and POS. G-08 deferred the menu fork as G-09 rather than inventing “support-exceed.”

Support-exceed is **not** productized. G-08 long-term gate: “No admin support-exceed productization (G-09).”

## What did not change

- `checkLimit()` remains the cap oracle.
- Occupancy remains `COUNT(domain rows)`.
- G-07 mutex + RC occupancy txn unchanged.
- G-08 restaurant-row lock order unchanged.
- G-09 admin skip of **feature** `menuManagement` is **not** introduced; feature gate still runs for admin.
- G-04 onboarding bootstrap unchanged.

## Exemption bar

A future exemption requires an explicit Architecture Authority decision, a documented invariant exception, and tests. Role=`admin` is not that decision.
