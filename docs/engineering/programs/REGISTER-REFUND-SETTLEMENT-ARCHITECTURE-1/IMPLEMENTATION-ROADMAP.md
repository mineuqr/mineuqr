# REGISTER-REFUND-SETTLEMENT-ARCHITECTURE-1 — Implementation Roadmap

| Field | Value |
|---|---|
| **Program** | REGISTER-REFUND-SETTLEMENT-ARCHITECTURE-1 |
| **Verdict** | **ARCHITECTURE CERTIFIED** |
| **Note** | Design only — no code in this program |

---

| Phase | Intent | Depends on |
|-------|--------|------------|
| **0** | Architecture certified (this program) | ADR-032 / 028 / 030 · REFUND-REGISTER-ADOPTION-1 |
| **A** | Ledger/Detail: show Register Settlement status for RF rows | Read Attribution |
| **B** | Ops repair: retry AttributeRefund when context available | Phase A |
| **C** | Optional cashier confirm-cash UX (custody ack only) | Phase A |
| **D** | ADR-033 ratification | Architecture Decision |
| **E** | Multi-register policy presentation | ADR-033 / Duty model |

**Already production-certified (do not re-implement):** Check ApplyRefund, RF SR publish, RF numbering, post-commit AttributeRefund with signed cash, fail-open skip.

---

## Final Certification

**ARCHITECTURE CERTIFIED**
