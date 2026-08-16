# LONG-TERM QUALITY GATE

Application cascade remains the ownership enforcer for restaurant children, including POS. No FK migration required for correctness today.

Growth: many terminals/grants/idempotency rows delete with `restaurantId` indexes already on those tables.

Not over-engineered: no job, no POS lock, no Commercial limiter, no occupancy COUNT change.

Pre-existing incomplete cascade (CRMP, checks, settlement records) is **out of G-05**. Restaurant wipe already deleted orders; this program did not expand financial destruction.
