# 00 — PROGRAM PACKAGE

**Program:** COMMERCIAL-LIMIT-OCCUPANCY-ARCHITECTURE-1  
**Date:** 2026-08-16  
**Mode:** READ-ONLY FORENSIC AUDIT → OPTIONS → DECISION → IMPLEMENT ONLY IF REQUIRED → CERTIFY  
**Predecessor:** POS-COMMERCIAL-ENTITLEMENT-VERIFICATION-1  
**STATUS:** PASS — LOCALLY CERTIFIED (architecture only; no implementation)  
**Code change:** NONE  
**Migration:** NONE (would be required for the chosen future primitive; not authorized here)  
**Commit / push / deploy:** NONE  
**Production mutation:** 0  

## Mission

Determine whether MineuQR needs a **shared** Commercial Limit Occupancy architecture. The predecessor found a real check-then-act race. It is **not** POS-specific.

## Decision (summary)

`checkLimit()` + later domain insert **does not** guarantee `occupancy <= cap` under concurrency. A normal application transaction around COUNT + INSERT also does **not** serialize the race (non-locking reads under InnoDB/TiDB).

A shared Commercial occupancy primitive **is** the correct long-term architecture.

It is **not** implemented in this program:

- A correct primitive needs a tenant-scoped lock record (migration) **or** parent-row `FOR UPDATE` wiring across every create path, plus real-database concurrency tests.
- This program does not authorize Production schema change.
- Next listed program remains `POS-READ-APIS-IMPLEMENTATION-1`.
- Occupancy implementation belongs to a later Commercial program.

## Commercial Capability Impact

```
Commercial Capability Impact: NO (architecture; no new capability, no new enforcement)
Required Capability: none
Affected Operations: none mutated
```

## Must not

POS-specific lock · occupancy service inside POS/Order/Check/Settlement/CRMP/Devices · lock Live Plan / `commercial_limit_values` rows · global lock · invent downgrade freeze policy · Production apply.
