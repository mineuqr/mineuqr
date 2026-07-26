# REGISTER-REFUND-SETTLEMENT-ARCHITECTURE-1 — Invariant List

| Field | Value |
|---|---|
| **Program** | REGISTER-REFUND-SETTLEMENT-ARCHITECTURE-1 |
| **Verdict** | **ARCHITECTURE CERTIFIED** |

---

## Register Refund Settlement invariants

| ID | Statement |
|----|-----------|
| **RRS-INV-01** | RF Settlement Record must exist before Register Settlement |
| **RRS-INV-02** | An RF Settlement Record is attributed at most once (idempotent) |
| **RRS-INV-03** | Non-applicable refund statuses cannot be newly attributed |
| **RRS-INV-04** | Custody amounts derive from published SR payment snapshot only |
| **RRS-INV-05** | Only cash tender portions change Expected Cash |
| **RRS-INV-06** | Attribution failure MUST NOT reverse financial refund commit |
| **RRS-INV-07** | Missing Register/Shift/operator → skip — never invent context |
| **RRS-INV-08** | Drawer variance ≠ Refund financial truth |
| **RRS-INV-09** | Completed Attribution is immutable |
| **RRS-INV-10** | RF number is identity-only |

## Inherited (must remain)

| ID | Source |
|----|--------|
| RF-INV-REG01…03 | ADR-ARCH-032 |
| RF-INV-T03 fail-open | ADR-ARCH-032 / 030 |
| RF-LAW-09 Register not money owner | ADR-ARCH-032 |
| SR-INV-* immutability | ADR-ARCH-026 |

---

## Final Certification

**ARCHITECTURE CERTIFIED**
