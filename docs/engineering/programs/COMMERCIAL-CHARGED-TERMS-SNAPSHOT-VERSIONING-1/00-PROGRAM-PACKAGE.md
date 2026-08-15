# 00 — PROGRAM PACKAGE

**Program:** COMMERCIAL-CHARGED-TERMS-SNAPSHOT-VERSIONING-1  
**Date:** 2026-08-15  
**HEAD at start:** `e936e654`  
**Status:** IMPLEMENTATION COMPLETE — STOP before Production migrate / commit / deploy  

Production SELECT `2026-08-15T16:52:23.980Z`: 7 subscriptions, 3 complete bindings, snapshot table absent, 4 unbound. 0089 not applied.  

## Model

**B — dedicated insert-only table** `commercial_subscription_charged_terms`.

Binding remains 1:1 enrollment. Charged columns on Binding are leftover projection, not authority once a snapshot exists.

## CURRENT SNAPSHOT RULE

For subscription S: the row with greatest `effectiveFrom`, then greatest `version`.

`effectiveFrom` = mutation commit time. Future-dated changes are not supported.

No `effectiveTo` column (avoids mutating historical rows). Supersession is the allowed transition.

## Deploy gate

Runtime snapshot writes require migration `0089`. Do **not** apply 0089 or deploy this runtime to Production until Architecture Authority authorizes both together.

## Out of scope (honored)

Complimentary, OD-4, SAFE DELETE, webhook integer READ, checkout pricing, trial semantics, Production DML.
