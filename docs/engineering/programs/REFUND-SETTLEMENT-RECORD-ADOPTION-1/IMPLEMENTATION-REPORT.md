# REFUND-SETTLEMENT-RECORD-ADOPTION-1 — Implementation Report

| Field | Value |
|---|---|
| **Program** | REFUND-SETTLEMENT-RECORD-ADOPTION-1 |
| **Phase** | Production Adoption |
| **Mode** | Constitutional Adoption |
| **Date** | 2026-07-26 |
| **Authority** | ADR-ARCH-032 · ADR-ARCH-026 · REFUND-DOMAIN-IMPLEMENTATION-1 |
| **Verdict** | **PRODUCTION CERTIFIED** |

---

## 1. Executive Summary

Refund publications are adopted as **native Settlement Records** on the existing Settlement Record Platform.

- No parallel refund store  
- No second ledger  
- No Settlement Record redesign  
- No Reporting Net Revenue cutover (deferred to REFUND-REPORTING-ADOPTION-1)  

Write path was already certified by REFUND-DOMAIN-IMPLEMENTATION-1. This program completes **read / DTO / presentation / chain adoption**.

---

## 2. What was adopted

| Layer | Adoption |
|-------|----------|
| Domain helpers | `settlementRecordAdoption.ts` — polymorphic kind helpers, chronological sort, chain integrity |
| API DTOs | `recordGeneration`, `priorSettlementRecordId`; receipt `recordKind` (contract v2) |
| API mapper | Maps chain fields; refund → `settlementStatus=refunded` |
| Read service | Uses shared newest-first sort (includes refund gens) |
| Presentation | Refunded/reversed/corrected labels; receipt no longer hardcodes `settlement` |
| Session panel | Polymorphic title/status for latest refund publication |
| Client queries | `recordKind` filter exposed (incl. `refund`) |
| Reporting adapter | Documented intentional exclude of refund gens (successor program) |

---

## 3. Files Changed

### Shared

- `shared/operational-session/check/settlementRecord/settlementRecordAdoption.ts` **(new)**
- `shared/operational-session/check/settlementRecord/index.ts`
- `shared/operational-session/check/index.ts`
- `shared/operational-session/index.ts`
- `shared/operational-session/check/settlementRecord/__tests__/settlementRecordAdoption.test.ts` **(new)**

### Server

- `server/operational-session/check/api/settlementRecordApiDtos.ts`
- `server/operational-session/check/api/settlementRecordApiMapper.ts`
- `server/operational-session/check/api/settlementRecordReadService.ts`
- `server/operational-session/check/api/__tests__/settlementRecordApiMapper.test.ts`
- `server/reporting-platform/settlementRecordReportingAdapter.ts` (comment / handoff only)

### Client

- `client/src/lib/settlement-record-presentation/settlementRecordApiTypes.ts`
- `client/src/lib/settlement-record-presentation/settlementRecordCopy.ts`
- `client/src/lib/settlement-record-presentation/settlementRecordViewModel.ts`
- `client/src/lib/settlement-record-presentation/useSettlementRecordQueries.ts`
- `client/src/components/settlement-record/SettlementSessionStatusPanel.tsx`
- `client/src/lib/settlement-record-presentation/__tests__/settlementRecordRefundAdoption.test.ts` **(new)**

### Docs

- `docs/engineering/programs/REFUND-SETTLEMENT-RECORD-ADOPTION-1/*`

---

## 4. Tests Executed

```
npx vitest run shared/operational-session/check/settlementRecord \
  client/src/lib/settlement-record-presentation/__tests__ \
  server/operational-session/check/__tests__/checkSettlementRecordIntegration.test.ts

Test Files  8 passed (8)
Tests       41 passed (41)
```

Adoption-specific coverage:

| Requirement | Result |
|-------------|--------|
| Refund publication | Pass |
| Multiple refund publications | Pass |
| Mixed settlement history | Pass |
| Chronological / generation ordering | Pass |
| Parent linkage | Pass |
| Immutability | Pass |
| Tenant isolation | Pass |
| Historical replay | Pass |
| Projection idempotency (dup identity) | Pass |
| Backward compatibility (paid/comp/void) | Pass |
| API polymorphic mapping | Pass |
| Presentation refund ≠ Settled | Pass |

---

## 5. Architectural Deviations

**NONE.**

---

## 6. Final Certification

**PRODUCTION CERTIFIED**
