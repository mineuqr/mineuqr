# 13 — SAFE DELETE READINESS

`subscription_plans` was **not** dropped.

| Question | Answer |
|----------|--------|
| Runtime commercial reads of leftover table | 0 (unchanged from forensics / OD-3) |
| Runtime commercial writes | 0 |
| ORM | Classified — KEEP until SAFE DELETE |
| Seeds / reset | Classified — KEEP |
| Migrations | Historical |
| Production rows | 3 leftover catalog rows |
| Schema dependencies | No FKs |
| Leftover identity bridges | **Still present** (webhook) |
| `bindings.legacyPlanId` column | **Still present** |

**SAFE DELETE: BLOCKED / NOT AUTHORIZED**

Cannot start `COMMERCIAL-SUBSCRIPTION-PLANS-SAFE-DELETE-1` while leftover identity bridges and the leftover bind column remain.
