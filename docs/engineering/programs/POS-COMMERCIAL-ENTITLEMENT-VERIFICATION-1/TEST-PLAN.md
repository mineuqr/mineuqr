# TEST PLAN

No new tests were added (no proven POS-layer gap). This matrix is the verification contract. Existing tests already prove the starred rows.

Expected result language: **allow** = command proceeds; **deny-C** = commercial (`entitlement_unavailable` / `PosEntitlementDeniedError`); **deny-A** = authorization/scope; **deny-P** = missing POS permission; **deny-T** = terminal identity/lifecycle/tenant.

## Subscription × operate (Sale / Check / Settlement / Register / Shift / Drawer)

Assume cashier has grants, owned active terminal, plan `posTerminals >= 1` unless noted.

| Subscription | Expected |
|--------------|----------|
| Active | allow * |
| Trial valid | allow (follows plan limits) |
| Grace | allow |
| Expired | deny-C |
| Cancelled | deny-C |
| Suspended | deny-C |
| Missing / NONE | deny-C * (missing/zero) |
| Unreadable live plan | deny-C |

## Plan limit × provision

| Limit | Existing | Action | Expected |
|-------|----------|--------|----------|
| 0 | 0 | provision | deny-C * |
| 1 | 0 | provision | allow * |
| 1 | 1 | provision | deny-C * |
| N | N | provision | deny-C |
| N | N-1 | provision | allow |
| Over limit (5 vs 2) | 5 | provision | deny-C |
| Over limit (5 vs 2) | 5 | sale | allow (included>0; see plan-change) |
| Unavailable / missing | — | provision | deny-C * |
| Unlimited (ADMIN) | any | provision | allow * |

## User × cashier mutation (entitled restaurant, active terminal)

| User | Grants | Expected |
|------|--------|----------|
| Owner | none | deny-P * |
| Owner | POS_ACCESS + command | allow * |
| `role=admin` | none | deny-P * |
| POS Cashier | POS_ACCESS + command | allow * |
| POS Cashier | POS_ACCESS only | deny-P * |
| Unauthorized staff | none | deny-A * |
| PLATFORM_OWNER | none | deny-P * |
| PLATFORM_OWNER | explicit grants | allow if restaurant commercially available |

## Terminal × cashier mutation

| Terminal | Expected |
|----------|----------|
| Owned active | allow * |
| Other restaurant | deny-T * |
| Deactivated | deny-T * |
| Replaced | deny-T * |
| Unknown | deny-T * |

## Command commercial gate

| Command | Gate | Expected when `available=false` |
|---------|------|----------------------------------|
| Provision | `assertProvisioningAllowed` | deny-C * |
| Sale | `resolvePosTerminalAccess` | deny-C * |
| Check Intake | same | deny-C |
| Settlement | same | deny-C |
| Register / Shift | same | deny-C |
| Drawer Movement | same | deny-C |

\* Covered by existing POS entitlement, commercial integration, terminal access, sale/check/settlement/crmp/drawer tests, or architecture guards.

## Concurrency

No test asserts atomic occupancy. Documented gap: two concurrent provisions can exceed cap. Do not add a POS lock test that implies a POS lock exists.
