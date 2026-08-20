# PAYMENT-COLLECTION-FACT-PRODUCTION-ELIGIBILITY-1 — Migration Report

**Migration required: YES**  
**Executed: NO**  
**Deployed: NO**

## Exact gap

0096 persistable `purpose` cannot store `production`. Published Revenue eligibility requires a purpose that isolated rows cannot occupy.

Existing schema cannot support publication of production facts without this enum expansion.

## Change

File: `drizzle/0097_payment_collection_facts_production_purpose.sql`

```sql
ALTER TABLE `payment_collection_facts` MODIFY COLUMN `purpose` enum('synthetic','shadow','test','validation','production') NOT NULL;
```

SHA-256: `8c92973d8d62797db46067b61e485d2036d6fae0e7e6c952a7e9ffcdf636fc45`

- Ownership: Payment Collection Fact infrastructure (ADR-039), not Cashier.
- No INSERT/UPDATE/DELETE of financial rows.
- No Check / Settlement / `payments` table changes.
- Rollback of publication does **not** require deleting facts. Rollback of the enum itself would be a separate DBA action and is not authorized here.

## Production journal (read-only)

| Item | Value |
|---|---|
| `__drizzle_migrations` terminus hash | `ae387c23fc92e9ac9769552f125fec5780d58eff3af59c3baa6306c235a0cb1f` (0096) |
| 0096 count | 1 |
| 0097 count | 0 |
| `payment_collection_facts` rows | 0 |
| purpose enum | `enum('synthetic','shadow','test','validation')` |

Do not apply 0097 until separately authorized.
