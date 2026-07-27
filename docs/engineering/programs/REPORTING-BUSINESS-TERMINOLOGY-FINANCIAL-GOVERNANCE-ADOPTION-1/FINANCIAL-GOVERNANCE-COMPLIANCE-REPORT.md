# Financial Governance Compliance Report

| Invariant | Status |
|-----------|--------|
| Settlement Record = canonical financial reporting source | **Preserved** (`settlement_record` default) |
| Operational reporting reads Order reporting models | **Preserved** |
| Financial reporting reads Settlement reporting models | **Preserved** |
| Operational vs Financial terminology not mixed as synonyms | **Enforced** via Product Semantics + deprecated labels |
| Financial reports represent post-settlement financial state | **Unchanged** (same aggregators) |
| Table / Waiter / QR / Self / Kiosk converge via Settlement | **Architecture unchanged** — presentation only |
| No formula / calculation changes | **Met** |
| No API / schema / migration / write-model / ownership changes | **Met** |

**Verdict:** Financial governance compliant.
