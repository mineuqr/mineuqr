# REGISTER-REFUND-SETTLEMENT-ARCHITECTURE-1 — Ownership Diagram

| Field | Value |
|---|---|
| **Program** | REGISTER-REFUND-SETTLEMENT-ARCHITECTURE-1 |
| **Verdict** | **ARCHITECTURE CERTIFIED** |

---

```mermaid
flowchart TB
  subgraph FSP["Financial Settlement Platform"]
    CHECK["Check Aggregate\n(Monetary SSOT)"]
    RFDOC["Refund Document\nSR recordKind=refund\n+ RF-######"]
    LEDGER["Settlement Ledger\n(Entry Point — not authority)"]
  end

  subgraph CRMP["Cash Register Management Platform"]
    REG["Register"]
    SHIFT["Financial Shift"]
    ATTR["Settlement Attribution\n= Register Refund Settlement"]
    EXP["Expected Cash\n(custody)"]
  end

  subgraph REP["Reporting Platform"]
    NET["Net / Gross consumers"]
  end

  LEDGER -->|"ApplyRefund intent"| CHECK
  CHECK -->|"publish compensating SR"| RFDOC
  CHECK -.->|"post-commit AttributeRefund\nfail-open"| ATTR
  ATTR --> REG
  ATTR --> SHIFT
  ATTR -->|"signed cash tender"| EXP
  RFDOC -->|"immutable publication"| NET
  ATTR -.->|"custody presentation only"| NET
```

| Plane | Owns | Does not own |
|-------|------|--------------|
| Check | Refund money, RF SR publish | Drawer cash |
| Identity | RF- number | Money / custody |
| CRMP Attribution | Register Refund Settlement | Refund authorization |
| Ledger | Operator entry | Money / custody SSOT |
| Reporting | Derived analytics | Money mutation |

---

## Final Certification

**ARCHITECTURE CERTIFIED**
