# LONG-TERM QUALITY GATE

**Program:** COMMERCIAL-ADMIN-LIMIT-ENFORCEMENT-1  

## REQUIRED NOW

- Admin category/item create uses the shared occupancy helper.
- No `role === admin` Commercial quantity bypass on those paths.
- Mixed owner/admin races honor one cap.

## REQUIRED FOUNDATION FOR FUTURE

- One persist function per quantity resource (`createXWithCommercialLimit`).
- Routers authorize, then call that function — never a role fork around occupancy.
- Bulk admin tools must occupy N slots inside the same serialization (or a documented atomic quantity primitive) — do not loop unlocked INSERTs.

## SAFE TO DEFER

- G-10 inactive rows occupy.
- G-11 freeze-on-downgrade.
- G-12 catalog idempotency.
- G-02 occupancy application deploy; G-03 git.
- D-class restaurant-owned inserts that are not quantity keys (offers/tables).
- Onboarding bootstrap (G-04).

## SHOULD NEVER BE INTRODUCED

- Admin-specific Commercial limit tables
- Role-specific occupancy counters
- Hardcoded admin quotas
- POS-specific Commercial logic
- A second Commercial enforcement system
- Bypassing Commercial because the caller is admin / owner / PLATFORM_OWNER

## Scale

Single restaurant: one mutex + parent row.  
Many restaurants: restaurant-scoped keys.  
Many terminals: existing POS occupancy.  
Concurrent cashiers/admins: same cap.  
Future branches: helper is application-side.  
Restaurant groups: do not treat admin role as group-wide unlimited quantity.
