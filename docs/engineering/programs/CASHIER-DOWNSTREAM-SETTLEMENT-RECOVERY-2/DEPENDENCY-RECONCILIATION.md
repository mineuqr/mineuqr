# DEPENDENCY-RECONCILIATION

| Program | Relationship |
|---|---|
| CASHIER-COLLECTION-FACT-CRITICAL-PATH-DECOUPLING-1 | Unchanged: HTTP after CF, `continueAfterCashierHttp` instead of bare `void` |
| CASHIER-DOWNSTREAM-SETTLEMENT-RECOVERY-1 | Obligation derivation kept. Production trigger added. In-memory backoff no longer the durability story |
| CASHIER-PRODUCTION-PAYMENT-COMMIT-FORENSICS-1 | Gaps addressed: OPEN≠unpaid, Vercel path, getByCheck no longer blocks toast. Forensic guards updated to the new invariants |
| Revenue Union authority | Unchanged |
| Collection Fact contract/execution/adoption | Unchanged writers |
