# REGISTER-REFUND-SETTLEMENT-ARCHITECTURE-1 — Risk Analysis

| Field | Value |
|---|---|
| **Program** | REGISTER-REFUND-SETTLEMENT-ARCHITECTURE-1 |
| **Verdict** | **ARCHITECTURE CERTIFIED** |

---

| Risk | Severity | Mitigation |
|------|----------|------------|
| Operators assume RF means cash already left drawer | High (ops) | Explicit two-plane UX; show Attribution status |
| Duplicate ownership if new “Refund Settlement Aggregate” invented | Critical | Forbidden — RRS stays CRMP Attribution |
| Inventing `paid_out` Drawer Movement as money SSOT | High | Keep signed Attribution custody model unless new ADR |
| Attribution skip unnoticed | Medium | Ops repair queue + Ledger status (roadmap A/B) |
| Cross-register attribution without open Shift | Medium | ADR-030 gates — never fabricate Shift |
| Card refund incorrectly decreases cash | High | RRS-INV-05 — cash portion only |
| Reporting double-count custody as revenue | High | Reporting consumes SR publications only |

---

## Final Certification

**ARCHITECTURE CERTIFIED**
