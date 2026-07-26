# REFUND-OPERATIONAL-WORKFLOW-ADOPTION-1 — Implementation Report

| Field | Value |
|---|---|
| **Program** | REFUND-OPERATIONAL-WORKFLOW-ADOPTION-1 |
| **Phase** | Production Adoption |
| **Mode** | Constitutional Adoption |
| **Date** | 2026-07-26 |
| **Authority** | ADR-ARCH-032 · REFUND-DOMAIN-IMPLEMENTATION-1 · REFUND-PRESENTATION-ADOPTION-1 |
| **Verdict** | **PRODUCTION CERTIFIED** |

---

## 1. Executive Summary

Operational Refund is executable from Settlement Ledger Detail.

- Thin `checkRefund` tRPC façade delegates to certified `CheckService.getCheckRefundBudget` / `applyRefundOnCheck`  
- Settlement Detail shows Refund when domain budget reports `eligible`  
- Confirm dialog submits amount/tender/reason; no presentation money math  
- On success: ledger queries invalidate; chain opens the new refund publication  

No Refund Domain, Check Aggregate, Settlement Record, Register, or Reporting redesign.

---

## 2. Files Changed

### Transport (façade only)

- `server/operational-session/check/api/checkRefundRouter.ts` **(new)**  
- `server/operational-session/check/api/checkRefundApiDtos.ts` **(new)**  
- `server/operational-session/check/api/mapCheckRefundApiError.ts` **(new)**  
- `server/routers.ts` — `checkRefund: checkRefundRouter`  

### Presentation / workflow

- `SettlementDetailSheet.tsx` — Refund action + post-success refresh/navigation  
- `SettlementRefundDialog.tsx` **(new)**  
- `useSettlementRecordQueries.ts` — budget + apply hooks + invalidation  
- `refundWorkflowPresentation.ts`, `checkRefundErrorPresentation.ts`, copy/types  

### Tests / docs

- `checkRefundRouter.test.ts` **(new)**  
- `refundOperationalWorkflow*.test.ts` **(new)**  
- Program reports under `docs/engineering/programs/REFUND-OPERATIONAL-WORKFLOW-ADOPTION-1/`  

---

## 3. Tests Executed

```
npx vitest run server/operational-session/check/api/__tests__/checkRefundRouter.test.ts \
  client/src/lib/settlement-record-presentation/__tests__/refundOperationalWorkflow.test.ts \
  client/src/lib/settlement-record-presentation/__tests__/refundOperationalWorkflow.architecture.guards.test.ts \
  client/src/lib/settlement-record-presentation/__tests__/settlementRecordPresentation.architecture.guards.test.ts
```

**Result:** 4 files / 18 tests passed.

---

## 4. Architectural Deviations

**NONE.**

Transport façade is authorization + DTO serialization over existing CheckService — not a second Refund Domain.

---

## Final Certification

**PRODUCTION CERTIFIED**
