# TEST PLAN

A. PosAccessContext consumption
B. `SALE_CREATE` authorization (`POS_ACCESS` required as well)
C. Tenant isolation
D. Terminal ownership / inactive terminal
E. Channel identity `cashier_pos`
F. Canonical Order creation via IdentityPlaceOrder
G. Session boundary (cross-restaurant deny; same-restaurant not attached)
H. Item validation
I. Modifier handling
J. Cashier attribution (server-derived)
K. Terminal attribution (canonical UUID on fulfilment)
L. Idempotency (replay / independent / conflict)
M. Retry safety
N. Historical attribution
O. Financial isolation (no client totals, no settle)
P. Existing channel preservation (guards)
Q. PLATFORM_OWNER
R. Admin
S. Owner
T. Device separation

Negative: unauthenticated (router `verifiedProcedure`), unauthorized cashier, missing `SALE_CREATE`, inactive/foreign terminal, cross-restaurant session, invalid item/qty/modifier, duplicate Order, fake client cashier/restaurant/terminal/channel/totals.
