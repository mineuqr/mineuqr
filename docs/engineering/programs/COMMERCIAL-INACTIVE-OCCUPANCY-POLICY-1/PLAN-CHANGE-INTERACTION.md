# PLAN CHANGE INTERACTION

**Program:** COMMERCIAL-INACTIVE-OCCUPANCY-POLICY-1  

G-11 owns downgrade. Recorded interaction only.

## Catalog example

cap=5, occupancy=5 (including two `isActive=false`). New cap=3.

Under G-10, occupancy remains **5** (inactive still count). G-11 must decide freeze vs keep-excess-operational vs force-delete. G-10 does **not** shrink COUNT on deactivate, so downgrade cannot “ignore” hidden rows.

## POS example

cap=5, 3 active + 2 deactivated. Occupancy=3. New cap=2.

G-11 sees occupancy 3, not 5. Deactivated terminals are not a hidden overflow.

## Do not implement here

No freeze, no auto-deactivate on downgrade, no rewrite of `checkLimit`.
