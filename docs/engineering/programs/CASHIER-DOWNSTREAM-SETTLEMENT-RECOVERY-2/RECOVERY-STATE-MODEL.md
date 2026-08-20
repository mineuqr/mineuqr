# RECOVERY-STATE-MODEL

```
CF missing
  → no cashier downstream obligation (this program)

CF production cashier + Check OPEN
  → PENDING (financially PAID, operational incomplete)

CF + Check PAID + ST + OS settled + SR settlement
  → COMPLETED

CF + Check PAID + any of ST/OS/SR missing
  → PENDING (fill only missing components)

CF + Check voided / complimentary
  → failed_requires_attention (financial fact unchanged)
```

Recovery identity = existing `collectionFactId`. Never mint `paymentIntentId`.

Concurrency: Check-owned finalize transaction + skip-if-exists ST/OS/SR. In-memory `inFlight` is an optimization, not cross-process safety.
