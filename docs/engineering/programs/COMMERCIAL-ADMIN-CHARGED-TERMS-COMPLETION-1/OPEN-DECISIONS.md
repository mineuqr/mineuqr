# OPEN DECISIONS

| ID | Topic | Status |
|----|--------|--------|
| OD-ADMIN-CT-04 | Admin update of plan/cycle should create a **new** Charged Terms snapshot vs remain lifecycle-only | **Follow-up.** This program makes update not overwrite historical terms. |
| OD-ADMIN-CT-03 | Historical unbound rows (600001, 690001, 750001, 780001) | Classify only. No backfill. |
| OD-ADMIN-CT-02 | INTERNAL rows in certified MRR | Unchanged: COMMERCIAL population only. |
| OD-ADMIN-CT-05 | Admin-entered custom amount | Not in this flow. Offer list price is the new-create contract. |
| Single SQL transaction | Wrap sub + binding in `db.transaction` | Not done. **Classification B: compensation**, not atomicity. Residual orphan windows documented in `TRANSACTION-ATOMICITY.md`. |

Out of scope: OD-4, SAFE DELETE, webhook integer READ, `subscription_plans` DROP.
