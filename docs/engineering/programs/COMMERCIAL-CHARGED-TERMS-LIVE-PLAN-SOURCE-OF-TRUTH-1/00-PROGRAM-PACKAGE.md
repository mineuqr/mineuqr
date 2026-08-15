# 00 — PROGRAM PACKAGE

**Program:** COMMERCIAL-CHARGED-TERMS-LIVE-PLAN-SOURCE-OF-TRUTH-1  
**Date:** 2026-08-15  
**HEAD:** `e936e654`  
**STATUS:** IMPLEMENTATION COMPLETE — not committed, not deployed, 0089 not applied  

## Governing model

**LIVE PLAN = current price authority** (`commercial_prices` via `currentPriceForPlan`).  
**CHARGED TERMS = immutable commitment fact.**  
Catalog edits do not reprice existing snapshots. Binding leftover charged fields are not price authority. `subscription_plans` is not price authority.

## 0089 replacement

CREATE empty `commercial_subscription_charged_terms`. **No Binding INSERT…SELECT.** No 780001 backfill. Production apply is a **separate** program.
