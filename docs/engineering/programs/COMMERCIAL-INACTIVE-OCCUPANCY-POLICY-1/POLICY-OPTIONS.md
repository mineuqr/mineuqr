# POLICY OPTIONS

**Program:** COMMERCIAL-INACTIVE-OCCUPANCY-POLICY-1  

## OPTION A — All persisted non-deleted rows consume capacity

Correct for restaurants/categories/items: `isActive`/`isAvailable` are operational, not commercial release. Prevents hiding rows to free slots.

**Wrong for POS `replaced`:** certified replacement would count old+new = 2. Forbidden by occupancyDelta=0.

## OPTION B — Only operational/active rows consume capacity

Lets a tenant deactivate every category and recreate the same cap of “active” categories while keeping data. Unfair, unpredictable, breaks reservation. Rejected for catalog.

Would match POS deactivated if applied only there — that is a **class-specific occupancy query**, not global B.

## OPTION C — Some states consume, some do not

True of POS (`registered`/`active` vs `deactivated`/`replaced`). Catalog booleans do not get a third “occupies=false” state.

## OPTION D — Grace period then non-counting

No product requirement. Adds a timer Commercial system. Rejected.

## OPTION E — Different resource classes, explicit occupancy definitions

**Selected.**

- Catalog/location: Option A (all persisted non-deleted).
- POS: occupancy = provisioned identity (`registered`+`active`), which is the meaning of the `posTerminals` limit.

This is not a second Commercial system. One helper, one `checkLimit`, class-specific COUNT callbacks (already the architecture).
