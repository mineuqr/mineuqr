# PAYMENT-COLLECTION-FACT-PRODUCTION-ELIGIBILITY-1 — Reconciliation Report

**Status: VALIDATED for the empty Collection Fact window**

Production `payment_collection_facts` row count (read-only, 2026-08-20): **0**  
Production purpose enum: **`synthetic|shadow|test|validation`** (0097 not applied)  
Published eligibility in application code: **`production` only**

Until 0097 is applied **and** a production fact is committed by a future authorized producer:

```
Published Union Gross = Legacy Settlement Record Gross
Published Union Net   = Legacy Net
```

Zero-CF fixtures remain equal on gross, net, tax, paid count, refund totals.

A production fact **without** overlapping Check authority would add exactly one Gross contribution. That path is tested in-process and is **not** live: no producer, 0097 not applied, row count 0.

Isolated facts still do not change published Gross.
