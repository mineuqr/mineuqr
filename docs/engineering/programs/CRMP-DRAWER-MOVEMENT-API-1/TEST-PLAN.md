# TEST PLAN

A. Domain: paid_in increases expected cash; paid_out/safe_drop cannot exceed expected; opening_float rejected on public API  
B. Idempotent replay of same key; conflicting payload rejected  
C. Authorized owner/admin; unauthenticated rejected; assertRestaurantAccess denied  
D. Closed register with no open shift rejected; closed shift immutable  
E. Wrong register; cross-restaurant register/shift rejected; shift hint mismatch  
F. Actor is authenticated user; client actor fields not in schema  
G. Concurrent same key does not duplicate; concurrent distinct keys serialize  
H. No Check/Settlement/Order/Revenue mutation; no POS cash tables; no 0094  
I. POS cashier guards still forbid POS `recordMovement`

Regression: CRMP Register/Shift, crmpRouter, POS folder, settlement.
