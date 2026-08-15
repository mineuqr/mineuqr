# RENEWAL-RESTORATION.md

## Rule

```
FROZEN  →  valid active subscription  →  ACTIVE
```

Same account, restaurant, menu, items, configuration, and QR identity. No rebuild. No new QR. No data migration.

## How restoration happens

State is derived. Existing billing / checkout already writes an active subscription period. The hub then stamps `ACTIVE` because `entitlementsEnabled` becomes true.

This program does **not** redesign Checkout, invoices, pricing, or Live Plans.

## Verified in tests

Expired paid or trial → `FROZEN` + capabilities denied.

Later row with a future `currentPeriodEnd` and `status: active` → `ACTIVE` + capabilities restored.

QR slug is not rewritten during Frozen or renewal.

## Follow-on

If a specific billing webhook fails to persist an active period, that is a billing repair — not a Frozen redesign.
