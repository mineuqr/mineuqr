# DATABASE-COMPATIBILITY.md

**Mode:** SELECT only. Terminus **0086** unchanged. No DML.

Queried: 2026-08-15 (this program).

## Catalog

| Check | Result |
|-------|--------|
| Live standard plans | **3** — Basic, Professional, Enterprise |
| Snapshots | table **ABSENT** |
| Versions | table **ABSENT** |
| Publications | table **ABSENT** |
| Retirements | table **ABSENT** |
| Duplicate plan codes | 0 |
| Bindings | **0** |

Capability counts: Basic 7, Professional 13, Enterprise 15.

## Instance tables (unchanged vs post-bootstrap)

| Table | Count |
|-------|------:|
| users | 3 |
| restaurants | 6 |
| user_subscriptions | 5 |
| subscription_plans | 3 |
| invoices | 7 |
| payments | 5 |
| subscription_history | 2 |
| orders | 42 |
| settlement_records | 39 |

## Owner `600001`

Identical fingerprint: planId 30002, status `active`, `currentPeriodEnd` 2026-08-07T21:00:00Z, `updatedAt` 2026-06-09T18:28:40Z.

## Tap `60001`

349.00 SAR, captured, paidAt 2026-05-19T09:39:13Z, `updatedAt` 2026-05-19T09:39:12Z.

## Checkout book

30001/30002/30003 still 19 / 39 / 99 USD monthly.
