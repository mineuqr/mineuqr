# RECOVERY-STATE-MACHINE

Derived from existing rows. Not a second ledger.

```
PENDING          CF exists + Check OPEN, or PAID missing ST/OS/SR
   ↓
PROCESSING       in-process lock / Check finalize in flight
   ↓
COMPLETED        Check PAID + ST + OS settled + settlement SR

PROCESSING
   ↓
RETRYABLE_FAILURE   transient error; Check still incomplete; sweep backoff
   ↓
PENDING

PROCESSING
   ↓
FAILED_REQUIRES_ATTENTION   voided/complimentary Check, or attempts ≥ 8 (opsLog error; sweep still retries)
```

`recoveryId` = `collectionFactId`. Not a new payment identity.
