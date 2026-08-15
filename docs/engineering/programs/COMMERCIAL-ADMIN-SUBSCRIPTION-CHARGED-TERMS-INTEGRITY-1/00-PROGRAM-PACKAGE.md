# 00 — PROGRAM PACKAGE

**Program:** COMMERCIAL-ADMIN-SUBSCRIPTION-CHARGED-TERMS-INTEGRITY-1  
**Role:** Architecture Authority  
**Date:** 2026-08-15  
**Mode:** READ-ONLY investigation  
**HEAD at start:** `ff7d2a62a06cd1d968895a4bbac5c384bddd7da1`  
**Branch:** `main`  
**Working tree before program:** clean  
**Status:** **INVESTIGATION COMPLETE** — architecture decision recorded. No Production mutation. No implementation.

## Trigger

Production subscription **780001** was created through the real Admin Subscription Management UI. The UI showed Enterprise, **$99.00 / monthly**, Active, renewal/end date, account-level. Production has **no Binding** and therefore **no Charged Terms**.

780001 is an INTERNAL/test account. It is still valid evidence of the Admin flow.

## Objective

Determine whether Admin subscription create/update correctly creates and maintains:

Admin Subscription → `user_subscriptions` → Canonical Live Plan UUID → Financial Binding → Charged Terms → Canonical MRR

## Non-goals (honored)

No OD-3, OD-4, SAFE DELETE, webhook retirement, `subscription_plans` DROP, Tax, FX, Refund, Credit Note, POS, Staff, Inventory. No Production INSERT/UPDATE/DELETE/ALTER/backfill. No Binding or Charged Terms creation. No MRR mutation. No Admin API or schema change.

## Evidence

| Item | Value |
|------|--------|
| SELECT | `2026-08-15T15:17:10.073Z` |
| Access | PRODUCTION (`tidbcloud_prod` / `mineuqr` / TLS / port 4000) |
| Mutation | NONE |
| Script | `_readonly-proof.mjs` |
| Capture | `_QUERY-EVIDENCE.json` |

## Package

| File | Contents |
|------|----------|
| `ADMIN-CREATE-FORENSICS.md` | UI → API → persist → bind |
| `ADMIN-UPDATE-FORENSICS.md` | Update lifecycle vs financial terms |
| `SUBSCRIPTION-FINANCIAL-BOUNDARY.md` | Lifecycle vs commitment; I-ADMIN-CT-01 |
| `CHARGED-TERMS-FORENSICS.md` | Snapshot ownership and immutability |
| `780001-FORENSICS.md` | Read-only row + audit |
| `PRODUCTION-SUBSCRIPTION-CLASSIFICATION.md` | All current `user_subscriptions` |
| `MULTI-SUBSCRIPTION-FORENSICS.md` | Accounts with >1 row |
| `MRR-INTEGRITY.md` | Qualifying → Charged Terms → monthly equivalent |
| `PRICE-SOURCE-FORENSICS.md` | What $99/month is |
| `BINDING-OWNERSHIP.md` | Entitlement vs financial |
| `ARCHITECTURE-DECISION.md` | A / B / C |
| `OPEN-DECISIONS.md` | Deferred ODs |
| `FINAL-REPORT.md` | Ten required answers |

## Architecture decision

**B. ADMIN FLOW HAS A FINANCIAL INTEGRITY GAP**

See `ARCHITECTURE-DECISION.md`. Not implemented in this program.
