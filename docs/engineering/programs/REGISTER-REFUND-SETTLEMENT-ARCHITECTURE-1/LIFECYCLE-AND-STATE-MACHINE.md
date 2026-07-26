# REGISTER-REFUND-SETTLEMENT-ARCHITECTURE-1 — Lifecycle & State Machine

| Field | Value |
|---|---|
| **Program** | REGISTER-REFUND-SETTLEMENT-ARCHITECTURE-1 |
| **Verdict** | **ARCHITECTURE CERTIFIED** |

---

## Lifecycle (planes)

```mermaid
sequenceDiagram
  participant Op as Operator
  participant Ledger as Settlement Ledger
  participant Check as Check Aggregate
  participant RF as RF Document / SR
  participant CRMP as Register Refund Settlement

  Op->>Ledger: مرتجع / Apply Refund
  Ledger->>Check: ApplyRefund command
  Check->>RF: Publish compensating SR + RF number
  Note over RF: Financial Decision complete<br/>Cash NOT implied
  Check-->>CRMP: Post-commit AttributeRefund
  alt Context complete
    CRMP->>CRMP: Attribution created
    Note over CRMP: REGISTER_SETTLEMENT_EXECUTED
  else Context incomplete
    CRMP-->>CRMP: skipped / failed
    Note over CRMP: AWAITING / SKIPPED<br/>RF remains valid
  end
```

---

## Custody state machine

```mermaid
stateDiagram-v2
  [*] --> RF_CREATED: Check commit
  RF_CREATED --> AWAITING_REGISTER_SETTLEMENT
  AWAITING_REGISTER_SETTLEMENT --> REGISTER_SETTLEMENT_EXECUTED: Attribution OK
  AWAITING_REGISTER_SETTLEMENT --> REGISTER_SETTLEMENT_SKIPPED: Incomplete context
  AWAITING_REGISTER_SETTLEMENT --> REGISTER_SETTLEMENT_FAILED: Create error
  REGISTER_SETTLEMENT_SKIPPED --> AWAITING_REGISTER_SETTLEMENT: Ops retry
  REGISTER_SETTLEMENT_FAILED --> AWAITING_REGISTER_SETTLEMENT: Ops retry
  REGISTER_SETTLEMENT_EXECUTED --> COMPLETED
  COMPLETED --> [*]
```

| State | Financial RF | Cash custody |
|-------|--------------|--------------|
| RF_CREATED | Exists | Unchanged |
| AWAITING… | Exists | Unchanged |
| EXECUTED / COMPLETED | Exists | Updated if cash tender |
| SKIPPED / FAILED | Exists | Unchanged |

---

## Final Certification

**ARCHITECTURE CERTIFIED**
