# REGISTER-REFUND-SETTLEMENT-ARCHITECTURE-1 — Event Flow

| Field | Value |
|---|---|
| **Program** | REGISTER-REFUND-SETTLEMENT-ARCHITECTURE-1 |
| **Verdict** | **ARCHITECTURE CERTIFIED** |

---

```mermaid
flowchart LR
  A[ApplyRefund committed] --> B[Refund / SR domain events]
  B --> C[RF Document published]
  C --> D{AttributeRefund}
  D -->|success| E[SettlementAttributed]
  D -->|skip| F[Operational skip log]
  D -->|fail| G[Operational fail log]
  E --> H[Expected Cash recalculated]
```

| Event / outcome | Plane | Money? |
|-----------------|-------|--------|
| Refund applied + SR created | Financial | Yes (already committed) |
| `SettlementAttributed` | Custody | Custody only |
| Skip / fail | Ops control | No |

**Decision:** Do not introduce a parallel `RefundSettlementCompleted` SSOT; treat it as a semantic alias of `SettlementAttributed` for refund SRs if product naming requires it.

---

## Final Certification

**ARCHITECTURE CERTIFIED**
