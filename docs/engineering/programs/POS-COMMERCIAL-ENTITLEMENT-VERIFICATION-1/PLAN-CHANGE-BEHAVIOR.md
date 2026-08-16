# PLAN CHANGE BEHAVIOR

## Authority

Current Live Plan is the commercial source of truth (existing MineuQR plan-change semantics). POS does not snapshot a historical POS plan.

## Example

Old plan: `posTerminals = 5`  
New plan: `posTerminals = 2`  
Existing terminals: 5 provisioned  

## Actual behavior (code)

| Question | Answer |
|----------|--------|
| Are existing terminals preserved? | **Yes.** No auto-delete, no auto-deactivate. |
| Are they deactivated? | **No** (not implemented; not invented here). |
| Can they still operate? | **Yes, if included > 0.** `available` is `included > 0`, not `provisioned <= included`. |
| Is only new provisioning blocked? | **Yes** when `provisioned + 1 > cap`. |
| Are mutations blocked? | Operational mutations continue while `available` is true. |
| Does Commercial already define this? | Predecessor POS-DOMAIN-ARCHITECTURE-IMPLEMENTATION-1: block new provisioning; do not auto-delete; deactivate/replace of excess is a later program. |
| Excess freeze policy | **Not defined** in Commercial. |

## PLAN-DOWNGRADE POS POLICY GAP (documented, not implemented)

Commercial has **not** defined whether over-limit **active** terminals must freeze on downgrade.

This program does **not** invent:

- auto-deactivation of excess terminals  
- a POS freeze flag  
- grandfather tables  
- plan-change hooks inside POS  

Current semantics (grandfather operations + block new slots while included > 0) are the existing implementation and remain in force until Commercial defines otherwise.

## Downgrade to 0 or expiration

`included = 0` → `available = false` → all operational POS commands deny with `entitlement_unavailable`. Provisioning denies. Terminals remain in storage.

## Classification

**C. SAFE TO DEFER** (and commercially owned): explicit excess-terminal freeze vs grandfather product policy.
