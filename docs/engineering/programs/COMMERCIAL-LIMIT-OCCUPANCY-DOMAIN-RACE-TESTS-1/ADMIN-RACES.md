# ADMIN RACES

## Observed policy (unchanged)

| Path | Quantity occupancy |
|------|--------------------|
| Admin restaurant create | **enforced** (`createRestaurantWithCommercialLimit`) |
| Admin category create | **skipped** (`createCategory`) |
| Admin item create | **skipped** (`createMenuItem`) |

RBAC admin is not a Commercial entitlement. Restaurant create already honors that. Category/item create does not.

## Concurrency

Admin skip has no occupancy lock. Concurrent admin category/item creates can persist `COUNT > cap`. That is the existing G-09 policy fork, not a newly discovered implementation bug in the helper.

G-08 did not change this policy.

## Verdict

**C. POLICY DECISION — G-09.** Do not classify as REQUIRED NOW occupancy hardening. Do not start G-09 from this program.
