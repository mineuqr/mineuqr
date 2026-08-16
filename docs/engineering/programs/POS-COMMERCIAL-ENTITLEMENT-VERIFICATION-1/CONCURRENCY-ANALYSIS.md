# CONCURRENCY ANALYSIS

## Finding

**COMMERCIAL LIMIT CONCURRENCY GAP**

`checkLimit` is a **read of entitlements + comparison**. It is not atomic with POS terminal insert (or with restaurant/category/item creates).

## Scenario (real)

Plan allows 2 POS terminals. Existing provisioned count = 1.

Concurrent request A: lists 1, `checkLimit(proposedTotal=2)` allowed, inserts.  
Concurrent request B: lists 1 before A commits, `checkLimit(proposedTotal=2)` allowed, inserts.

Result: **3 terminals against a limit of 2.**

Same-code races are partially mitigated by unique `(restaurantId, code)` (one insert wins; loser returns the winner). **Different codes / auto-assigned codes are not protected.**

## Existing Commercial mechanism?

There is **no** shared occupancy lock, advisory lock, or transactional `checkLimit` + persist API.

`assertRestaurantCreateAllowed` / category / item use the same check-then-act pattern.

## What this program must not do

- POS-specific mutex / advisory lock / “POS occupancy” table  
- A second commercial limiter  
- Pretend the race does not exist  

## Classification

**B. REQUIRED FOUNDATION FOR FUTURE** — owned by **shared Commercial / limit occupancy**, not POS.

If Commercial later adds an atomic occupancy primitive, POS provisioning should consume it. Until then, POS is consistent with restaurants/categories/items.

## Certification

**CONCURRENCY: DOCUMENTED GAP**

This is **not** a POS commercial-enforcement miss and **not** a reason to invent locking inside this program. It is **not** treated as `BLOCKED — COMMERCIAL ARCHITECTURE GAP` for POS verification: POS already uses the only approved limiter (`checkLimit`). Hardening that limiter is a Commercial program.

## Operational commands

Sale / Check / Settlement / CRMP commands do not increment `posTerminals`. Their concurrency is domain idempotency / Order transaction, not commercial occupancy.
