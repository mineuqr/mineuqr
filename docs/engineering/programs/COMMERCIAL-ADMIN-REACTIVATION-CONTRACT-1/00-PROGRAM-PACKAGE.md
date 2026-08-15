# 00 — PROGRAM PACKAGE

**Program:** COMMERCIAL-ADMIN-REACTIVATION-CONTRACT-1  
**Date:** 2026-08-16  
**Mode:** ARCHITECTURE CONTRACT + FORENSICS ONLY  
**HEAD:** `625280ff`  
**STATUS:** COMPLETE — no implementation, no migrate, no Production mutation, no commit

## Decision (locked by this program)

**Admin Reactivation is a NEW commercial commitment on the existing account subscription row.**

- Preferred model: **B** (revive row + insert new Charged Terms snapshot)
- Model A (reuse old snapshot as continuation) is **REJECTED**
- Model C (new subscription row) is **REJECTED** as the Admin Reactivation contract
- Current implicit `status=active` update is **NOT** the contract

Authorities remain:

```
Live Plan / commercial_prices     = CURRENT PRICE
Charged Terms Snapshot           = HISTORICAL PAID COMMITMENT
Concession                       = TEMPORARY FINANCIAL SUPPRESSION
user_subscriptions.planId        = ENTITLEMENT IDENTITY
MRR                              = current snapshot, suppressed while concession current
ARR                              = MRR × 12
```

Paid Admin create remains supported. OD-4 / SAFE DELETE remain blocked.

Implementation MUST NOT start until Architecture Authority accepts `13-ARCHITECTURAL-CONTRACT.md`.
