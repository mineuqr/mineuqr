# ADMIN / OWNER AUDIT

**Program:** COMMERCIAL-LIMIT-OCCUPANCY-FINAL-AUDIT-1  

G-09 confirmed on independent re-run.

- Owner and admin category/item creates both call `createCategoryWithCommercialLimit` / `createMenuItemWithCommercialLimit`.
- Restaurant create always uses the helper (admin may set `ownerUserId`; cap is that owner).
- POS has no role skip.
- No `if (role === admin) skip limit` on quantity creates.

TiDB: owner ∥ admin last slot occupancy 2, exceeded 1. Admin ∥ admin occupancy 2.
