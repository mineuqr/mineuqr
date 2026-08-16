# 00 — PROGRAM PACKAGE

**Program:** POS-DOMAIN-ARCHITECTURE-IMPLEMENTATION-1
**Date:** 2026-08-16
**Mode:** IMPLEMENTATION
**Predecessor:** POS-DOMAIN-ARCHITECTURE-INVESTIGATION-1 (PASS — INVESTIGATION COMPLETE)
**Source architecture:** POS-PLATFORM-ARCHITECTURE-1 (approved baseline; package not present in this repository)

| Item | Value |
|------|--------|
| Scope | POS Phase 1 Domain Foundation only |
| STATUS | PASS — LOCALLY CERTIFIED |
| Targeted tests | 47 passed / 0 failed |
| Build | PASS |
| Check | PRE-EXISTING (188 `error TS*`, none in this program) |
| Production mutation | 0 |
| Commit / push / deploy | NONE |
| Migration | `0091_pos_terminals` created locally; not applied |

This program implements the certified Phase 1 foundation. It does not invent a replacement for POS-PLATFORM-ARCHITECTURE-1. Investigation findings are treated as facts.

## Must implement

POS Terminal domain, Live Plan `posTerminals` quantity, `cashier_pos` channel registration, cashier permission namespace, restaurant-scoped APIs, fail-closed provisioning, architecture guards.

## Must not implement

POS UI, cashier workspace, direct sales, payment, settlement, Register/Shift, ZATCA, Offline Financial Mode, POS add-on billing, Production seed/apply.
