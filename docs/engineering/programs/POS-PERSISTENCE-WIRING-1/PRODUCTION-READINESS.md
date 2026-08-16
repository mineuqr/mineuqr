# PRODUCTION READINESS

LOCAL IMPLEMENTATION ONLY.

Done locally:

- Production composition uses Drizzle POS stores
- InMemory isolated to `NODE_ENV=test` and explicit test constructors
- Existing 0091â€“0093 tables reused; no 0094
- Unique indexes remain the uniqueness authority
- Fingerprint mismatch fails closed

Not done:

- Production data mutation
- Deploy
- Commit
- Push
- POS UI / `/pos` workspace
- Commercial freeze verification
- SQL persistence for Check/Settlement POS idempotency

Production already has empty POS tables from POS-DOMAIN-PRODUCTION-APPLY-1. This program does not insert terminals, grants, sales, Orders, Checks, or cash rows.

## Long-term SaaS gate

| Question | Answer |
|----------|--------|
| Why correct today | Certified tables + existing interfaces + DB unique indexes |
| Scale restaurants | Every query/key includes `restaurantId` |
| Scale terminals | Terminal PK + sale key includes `terminalId` |
| Concurrent cashiers | Unique index + process mutex; fingerprint fail-closed |
| Future branches | Restaurant-scoped now; branch key deferred |
| Hardware | `optionalDeviceId` already on terminal; not identity |
| Payments | Not in these stores; Order/Settlement remain authorities |
| Compliance | Durable rows; no client totals; ZATCA deferred |
| Debt | Check/Settlement POS idempotency still in-memory; Order+idempotency not one TX |
| Avoided | Generic repository, POS financial tables, 0094 |
| Defer | UI, freeze, orphan Order cleanup, Check/Settlement SQL idempotency |
