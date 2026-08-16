# SUBSCRIPTION BEHAVIOR

Existing lifecycle remains the only freeze:

`lifecycleEnablesEntitlements` false → plan NONE / zeroed limits → `checkLimit` deny.

An occupancy lock **must run after** (or include) that cap read. A lock that only serializes COUNT+INSERT without `checkLimit` would allow creates on expired subscriptions if a stale cap were used.

Order:

1. Auth + tenant  
2. Lock occupancy token (future)  
3. `checkLimit` with fresh entitlements (`now`)  
4. Persist  

Do not add a POS or occupancy-specific freeze table.

Expired + concurrent create: both denied by cap 0 even without a lock. Lock still prevents two creates sneaking in during a **transition** (active → expired mid-flight) if both observed the old cap; both would serialize, the second re-reads entitlements. That is a benefit of putting `checkLimit` **inside** the locked transaction in the future implementation.
