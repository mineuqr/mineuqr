# PAYMENT-COLLECTION-FACT-PRODUCTION-ELIGIBILITY-1

**IMPLEMENTED** — persistable `production` purpose and published eligibility  
**VALIDATED** — unit + architecture + migration governance tests  
**PRODUCTION VERIFIED** — current production table is empty; 0096 applied; **0097 not applied**  
**ADOPTED** — none (no Cashier writer, no production writes, no 0097 execution)  
**NOT ADOPTED** — Cashier, Confirm, PAID, Settlement, Collection Fact published money in production

This program makes a Collection Fact **structurally eligible** for Revenue Union when `purpose = production` and the fact is valid.

It does **not** connect Cashier. It does **not** execute the production migration. It does **not** invent refund/void/complimentary Collection Fact kinds.

## Production eligibility (explicit)

A Collection Fact may contribute to Published Revenue only if **all** hold:

1. `purpose === production` (`PUBLISHED_COLLECTION_FACT_PURPOSES`)
2. committed immutable insert-only fact
3. valid restaurant, order, intent, amount, tax, currency, business day, identity
4. no BOTH conflict with a paid Check for the same economic identity
5. not UNRESOLVED

Isolated purposes `synthetic | shadow | test | validation` **never** publish.

## Migration

**Required: YES** — `0097_payment_collection_facts_production_purpose` expands the MySQL `purpose` enum.

**Executed: NO.**

Until 0097 is separately authorized and applied, production cannot persist `purpose=production`. Application eligibility is ready; persistability is not live.

## Refund / void / complimentary

**Governed gap blocking Cashier adoption, not invented here.**

- Kind remains `collection` (paid collection).
- Complimentary / void remain Check/SR outcomes.
- Refund remains a compensating Settlement Record against Check authority. Original Collection Fact stays insert-only.
- Cashier must not write production facts until a Collection Fact-native compensating-event program exists.

## Documents

- [ARCHITECTURE-DECISION-REPORT.md](./ARCHITECTURE-DECISION-REPORT.md)
- [IMPLEMENTATION-REPORT.md](./IMPLEMENTATION-REPORT.md)
- [VALIDATION-REPORT.md](./VALIDATION-REPORT.md)
- [RECONCILIATION-REPORT.md](./RECONCILIATION-REPORT.md)
- [MIGRATION-REPORT.md](./MIGRATION-REPORT.md)
