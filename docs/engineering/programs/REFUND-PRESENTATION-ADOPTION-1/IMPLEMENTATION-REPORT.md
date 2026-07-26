# REFUND-PRESENTATION-ADOPTION-1 — Implementation Report

| Field | Value |
|---|---|
| **Program** | REFUND-PRESENTATION-ADOPTION-1 |
| **Phase** | Production Adoption |
| **Mode** | Constitutional Adoption |
| **Date** | 2026-07-26 |
| **Authority** | ADR-ARCH-032 · ADR-ARCH-026 · ADR-ARCH-028 · REFUND-SETTLEMENT-RECORD-ADOPTION-1 · REFUND-REGISTER-ADOPTION-1 · REFUND-REPORTING-ADOPTION-1 |
| **Verdict** | **PRODUCTION CERTIFIED** |

---

## 1. Executive Summary

Refund is adopted into the Presentation Layer **inside Settlement Ledger** (Unified Financial Entry Point).

- No refund-only workspace  
- Status facet: Paid / Refunded / Complimentary / Voided / All  
- Detail: generation, prior settlement, compensating chain timeline, Register/Shift/Operator labels  
- Presentation copies immutable publication fields — no financial calculations  

---

## 2. Files Changed

### Presentation lib

- `settlementHistoryFilterPresentation.ts` **(new)**  
- `settlementChainPresentation.ts` **(new)**  
- `settlementRecordCopy.ts`, `settlementRecordViewModel.ts`, `settlementRecordApiTypes.ts`  
- `useSettlementRecordQueries.ts` — `useSettlementRecordsByCheck`  
- `index.ts`  

### UI

- `SettlementHistoryPanel.tsx` — status filter, business day, generation  
- `SettlementDetailSheet.tsx` — chain, prior link, attribution, RTL, audit labels  
- Session mounts wire `onOpenSettlementRecord` (ActionBar, QuickActions, Workspace)  

### Read API enrichment (labels only)

- `settlementRecordAttributionDisplay.ts` **(new)**  
- `settlementRecordApiDtos.ts`, `settlementRecordApiMapper.ts`, `settlementRecordReadService.ts`  

### Tests / docs

- `refundPresentationAdoption.test.ts` **(new)**  
- `refundPresentationAdoption.architecture.guards.test.ts` **(new)**  
- Program reports under `docs/engineering/programs/REFUND-PRESENTATION-ADOPTION-1/`  
- ADR registry / ADR-032 status  

---

## 3. Screens Adopted

| Screen | Adoption |
|--------|----------|
| Settlement History (Dashboard → Settlements) | Status filter + refund row cues |
| Settlement Detail sheet | Chain / prior / attribution / audit |
| Session workspace / action bar / quick actions | Chain navigation via detail sheet |
| Settlement Session Status panel | Already polymorphic (prior program) |

---

## 4. Tests Executed

```
npx vitest run client/src/lib/settlement-record-presentation/__tests__/refundPresentationAdoption.test.ts \
  client/src/lib/settlement-record-presentation/__tests__/refundPresentationAdoption.architecture.guards.test.ts \
  client/src/lib/settlement-record-presentation/__tests__/settlementRecordRefundAdoption.test.ts \
  client/src/lib/settlement-record-presentation/__tests__/settlementHistoryUx.architecture.guards.test.ts \
  client/src/lib/settlement-record-presentation/__tests__/settlementRecordPresentation.architecture.guards.test.ts \
  server/operational-session/check/api/__tests__/settlementRecordApiMapper.test.ts
```

**Result:** 6 files / 27 tests passed.

---

## 5. Architectural Deviations

**NONE.**

---

## Final Certification

**PRODUCTION CERTIFIED**
