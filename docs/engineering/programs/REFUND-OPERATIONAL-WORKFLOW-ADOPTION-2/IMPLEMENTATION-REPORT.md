# REFUND-OPERATIONAL-WORKFLOW-ADOPTION-2 — Implementation Report

| Field | Value |
|---|---|
| **Program** | REFUND-OPERATIONAL-WORKFLOW-ADOPTION-2 |
| **Phase** | Production Operational Workflow Redesign |
| **Mode** | Constitutional Adoption |
| **Date** | 2026-07-26 |
| **Authority** | ADR-ARCH-032 · REFUND Platform Production Certified · ADOPTION-1 superseded for entry UX |
| **Verdict** | **PRODUCTION CERTIFIED** |

---

## 1. Executive Summary

Refund is an independent operational workflow launched only from Settlement Ledger via **مرتجع**.

- Settlement Number manual lookup (identity parse extensible for barcode/QR/scanner later)
- Business Refund Policy (default 24h window) evaluated at lookup and apply
- Dedicated ledger Refund dialog: summary → full/partial → Save / Save & Print / Cancel
- Settlement Detail is informational only — deprecated Detail **استرداد** path removed
- Apply still creates append-only compensating Settlement Record via certified CheckService

No changes to Check Aggregate money rules, Settlement Aggregate ownership, Refund Domain, Reporting, Register, Event Architecture, tax/payment calculations, or ADR boundaries.

---

## 2. Files Changed

### Policy (shared, presentation/transport evaluation)

- `shared/operational-session/check/businessRefundPolicy.ts` **(new)** — defaults, parse/serialize, `evaluateRefundWindow`, codes `REFUND_WINDOW_EXPIRED` / `REFUND_POLICY_DISABLED`
- Barrel exports via operational-session / check

### Identity (extensible lookup input)

- `shared/operational-document-identity/provider.ts` — `parseSettlementOperationalIdentity` (ST-… / digits; rejects `sr:`)

### Transport façade

- `server/operational-session/check/api/checkRefundLookupService.ts` **(new)** — lookup DTO + `assertRefundPolicyAllowsApply`
- `server/operational-session/check/api/checkRefundRouter.ts` — `lookupBySettlementNumber`; apply calls policy assert + optional `managerApproved`

### Presentation / UX

- `SettlementHistoryPanel.tsx` — toolbar **مرتجع** → ledger dialog; Save & Print → receipt
- `SettlementLedgerRefundDialog.tsx` **(new)** — Steps 1–5 workflow
- `SettlementDetailSheet.tsx` — refund write UI removed (informational only)
- `SettlementRefundDialog.tsx` **(deleted)** — deprecated Detail entry removed
- Hooks/copy/errors: `useLookupCheckRefundBySettlementNumber`, window presentation, `window_expired` / `unknown_settlement`

### Tests / docs

- `businessRefundPolicy.test.ts`, `parseSettlementOperationalIdentity.test.ts`
- Updated `checkRefundRouter.test.ts`, `refundOperationalWorkflow*.test.ts`
- This program folder

---

## 3. Tests Executed

```
pnpm exec vitest run \
  shared/operational-session/check/__tests__/businessRefundPolicy.test.ts \
  shared/operational-document-identity/__tests__/parseSettlementOperationalIdentity.test.ts \
  client/src/lib/settlement-record-presentation/__tests__/refundOperationalWorkflow.test.ts \
  client/src/lib/settlement-record-presentation/__tests__/refundOperationalWorkflow.architecture.guards.test.ts \
  server/operational-session/check/api/__tests__/checkRefundRouter.test.ts
```

**Result:** 5 files / 21 tests passed.

---

## 4. Architectural Deviations

**NONE.**

Policy evaluation and Settlement Number resolution live in transport/presentation façades. Domain apply path remains `CheckService.applyRefundOnCheck`.

Policy persistence uses optional `refundPolicyJson` parse with certified defaults when absent (no migration required for ADOPTION-2).

---

## Final Certification

**PRODUCTION CERTIFIED**
