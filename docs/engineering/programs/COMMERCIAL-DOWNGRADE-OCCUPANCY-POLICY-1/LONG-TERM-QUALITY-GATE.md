# LONG-TERM QUALITY GATE

**Program:** COMMERCIAL-DOWNGRADE-OCCUPANCY-POLICY-1  

A later occupancy or Commercial change must not:

1. Auto-delete or auto-deactivate rows on plan downgrade.
2. Freeze restaurants/menus/POS solely because occupancy > new cap.
3. Hide inactive catalog rows from COUNT to “fit” a downgrade (violates G-10).
4. Add a downgrade-debt table or leftover counter.
5. Let owner/admin/PLATFORM_OWNER role bypass `checkLimit` after downgrade.
6. Block POS replace (`occupancyDelta = 0`) only because occupancy > cap.
7. Merge downgrade with FROZEN / expiration.
8. Invent staff/branches/devices/screens occupancy without a dedicated program.
9. Claim `occupancy <= cap` after downgrade if Policy B still holds.
10. Connect synthetic tests to Production.

Required tests if occupancy or plan-bind changes:

- create after occupancy > new cap
- delete until `occupancy + 1 <= cap`
- upgrade immediately allows create
- POS replace at over-cap
- POS reactivate at over-cap denied
- G-10 inactive still occupies after downgrade
- G-07 / G-08 / G-09 regressions
