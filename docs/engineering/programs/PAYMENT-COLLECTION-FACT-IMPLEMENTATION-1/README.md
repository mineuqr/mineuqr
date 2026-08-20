# PAYMENT-COLLECTION-FACT-IMPLEMENTATION-1

First implementation program after FINANCIAL-AUTHORITY-SUPERSESSION-ADR-1 / [ADR-ARCH-039](../../../architecture/adrs/ADR-ARCH-039-payment-collection-financial-authority.md).

**Classification: PRODUCTION READY INFRASTRUCTURE — NOT ADOPTED**

This program builds and validates immutable Payment Collection Fact infrastructure. It does **not** adopt Collection Facts into Cashier, Revenue, Settlement, or PAID.

## Governing model

| Concept | Meaning |
|---|---|
| Payment | Collection process |
| Collection Fact | Insert-only financial authority (dormant until certified adoption) |
| PAID (legacy) | Successful Check finalize (`operational_checks.outcome = paid`) |
| Check | Operational / commercial bill |
| Settlement | Downstream financial processing (unchanged) |
| Revenue | Unchanged; Collection Facts do not contribute |
| Refund | Compensating event (out of scope) |

## Absolute scope

In scope: Collection Fact schema, insert-only writer, idempotency, tenant isolation, financial/tender snapshot, synthetic/shadow/test/validation purposes, tests, documentation.

Out of scope: Cashier adoption, Confirm replacement, Revenue union, Settlement decoupling, Check removal, PAID migration, OS/SR removal from Confirm, Reporting, Session/Kiosk/Waiter/QR.

## Ownership

```
Payment process (future Confirm adoption — not this program)
      ↓
Collection Fact Writer  (`commitCollectionFact`)
      ↓
Collection Financial Authority (`payment_collection_facts`)
```

The writer lives under `server/operational-session/payment/collection-fact/`. It is **not** exported from `PaymentConfirmService` or `server/operational-session/payment/index.ts`.

## Isolation

Every persisted fact must have `purpose` ∈ `synthetic | shadow | test | validation`. There is no `production` purpose. Cashier Confirm still runs ADR-038 §7 (Check + Charges + ST + OS + SR).

## Documents

- [IMPLEMENTATION-REPORT.md](./IMPLEMENTATION-REPORT.md)
- [VALIDATION-REPORT.md](./VALIDATION-REPORT.md)
