# IDEMPOTENCY AUDIT

## restaurants / categories / items

No create idempotency key. Lost-response retry after **success** can insert a **second** row.

If the helper is live: second insert is counted; at cap the retry is **denied**. That does **not** push occupancy above cap. It can create **duplicate catalog rows below cap** (product duplicate, not commercial overflow).

**Not REQUIRED NOW** for the occupancy invariant. Duplicate menu rows are a resilience/UX issue (**D. SAFE TO DEFER** with that justification).

## POS register same code

Sequential: return existing before lock.  
Concurrent: `resolveExisting` after `FOR UPDATE`. Occupancy not double-consumed. **PROVEN** (helper MySQL + domain unit test sequential).

Uncoded register generates `nextPosTerminalCode` — concurrent uncoded registers are **two identities** and correctly compete for slots.

## POS provisioned replace

Not idempotent under concurrency (two replacements). Can exceed occupancy. See CREATE-PATH / POS. **REQUIRED NOW**.

## Helper lock retry

Deadlock/lock-wait retries the **whole** transaction. Failed insert rolls back. No double occupancy from that retry.

## `assertProvisioningAllowed`

Leftover check-then-act. Not on live POS create. **D** to delete later; **B** if someone rewires it in front of insert.
