# REFUND-REGISTER-ADOPTION-1 — Implementation Report

| Field | Value |
|---|---|
| **Program** | REFUND-REGISTER-ADOPTION-1 |
| **Phase** | Production Adoption |
| **Mode** | Constitutional Adoption |
| **Date** | 2026-07-26 |
| **Authority** | ADR-ARCH-032 · ADR-ARCH-028 · ADR-ARCH-030 · REFUND-DOMAIN-IMPLEMENTATION-1 · REFUND-SETTLEMENT-RECORD-ADOPTION-1 |
| **Verdict** | **PRODUCTION CERTIFIED** |

---

## 1. Executive Summary

Register Operations adopts Refund **publications** as custody Attribution only.

- Check Aggregate remains sole Refund executor  
- Register attributes refund Settlement Records to Register + Financial Shift + Operator  
- Cash refund decreases Expected Cash via signed custody fact  
- Fail-open post-commit (ADR-030) — never rolls back money  
- No Revenue / Net Revenue / Settlement mutation  

---

## 2. Files Changed

### Shared CRMP

- `shared/crmp/settlementContext/settlementAttributionAdoption.ts` — refund eligibility + signed cash custody helper  
- `shared/crmp/financialShift/financialShiftCommands.ts` — `cashTenderAmount` allows signed money  
- `shared/crmp/financialShift/financialShiftContract.ts` — custody comment  
- `shared/crmp/__tests__/refundRegisterAdoption.test.ts` **(new)**  
- `shared/crmp/__tests__/settlementAttributionAdoption.test.ts`  

### Server Check Aggregate

- `server/operational-session/check/checkSettlementAttributionAdoption.ts` — `adoptRefundAttributionAfterFinalize`  
- `server/operational-session/check/CheckService.ts` — post-commit AttributeRefund wire  
- `server/operational-session/check/checkRefundIntegration.ts` — comment  
- `server/operational-session/check/__tests__/checkRefundAttributionAdoption.test.ts` **(new)**  

### Docs

- `docs/engineering/programs/REFUND-REGISTER-ADOPTION-1/*`  
- ADR registry / ADR-032 status updates  

---

## 3. Tests Executed

```
npx vitest run shared/crmp/__tests__/refundRegisterAdoption.test.ts \
  server/operational-session/check/__tests__/checkRefundAttributionAdoption.test.ts \
  server/operational-session/check/__tests__/checkSettlementAttributionAdoption.test.ts

Test Files  3 passed
Tests       20 passed
```

Plus settlement attribution helper extension (refund eligibility) in `settlementAttributionAdoption.test.ts`.

| Scenario | Result |
|----------|--------|
| Cash refund attribution | Pass |
| Card refund attribution | Pass |
| Mixed tender refund | Pass |
| Shift Expected Cash decrease | Pass |
| Operator / Register / Shift identity | Pass |
| Tenant isolation (missing operator) | Pass |
| Idempotent retry | Pass |
| Fail-open incomplete context | Pass |
| Backward compat (non-refund skip) | Pass |
| Existing settle attribution unchanged | Pass |

---

## 4. Architectural Deviations

**NONE.**

---

## 5. Final Certification

**PRODUCTION CERTIFIED**
