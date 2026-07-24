# SELF-ORDERING-COUNTER-PICKUP-ARCHITECTURE-1 — Phase 1 Architecture Audit

| Field | Value |
|---|---|
| **Program** | SELF-ORDERING-COUNTER-PICKUP-ARCHITECTURE-1 |
| **Phase** | Phase 1 — Architecture Audit |
| **Date** | 2026-07-24 |
| **Mode** | Read-only at certification — superseded by Phase 2 for UI |
| **Verdict** | **PHASE 1 ARCHITECTURE AUDIT CERTIFIED** |

See conversation audit summary and Phase 2 report for the adopted customer journey.

### Architectural truths certified in Phase 1

1. Kitchen starts from `OrderCreated`, not Settlement.  
2. `ensureCheckForOrder` must remain.  
3. Customer payment was a UI layer only.  
4. Settlement Platform remains the financial owner.  
5. Check Aggregate and Kitchen Platform remain unchanged.

### Known impact for later phases

**IMPACT-1:** Dashboard `session.markPaid` cannot settle kiosk sessionless Checks. Phase 4 must reuse Order/Check settle façade — not Session Mark Paid alone.
