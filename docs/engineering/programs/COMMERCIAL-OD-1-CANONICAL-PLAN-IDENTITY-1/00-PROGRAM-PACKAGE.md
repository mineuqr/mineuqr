# COMMERCIAL-OD-1-CANONICAL-PLAN-IDENTITY-1

| Field | Value |
|-------|-------|
| **Type** | Architecture decision only — no implementation |
| **Date** | 2026-08-15 |
| **Authority** | Architecture Authority / Technical Design Authority |
| **Resolves** | OD-1 — Canonical Plan Identity |
| **Status** | **CANONICAL PLAN IDENTITY DECISION — APPROVED** |

## Decision

`commercial_plans.id` (UUID) is the ONE canonical internal Commercial Plan identity.

`commercial_plans.code` is a stable business/catalog key. It is not the canonical internal ID.

## What this program did

- Forensic proof of UUID vs `code`
- Impact analysis (subscription, binding, checkout, webhook, trial, API)
- Architectural invariants I-OD1-01…09
- Proposed ADR-034 identity refinement (not applied)

## What this program did not do

- No schema, API, checkout, webhook, trial, MRR, Charged Terms, or entitlement change
- No ADR file edit
- No commit / push / deploy
- No SAFE DELETE
- No identity cutover (OD-2…OD-5 remain implementation decisions)

## STOP

Do not implement the cutover from this program.
