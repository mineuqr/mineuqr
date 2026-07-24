# CRMP-IMPLEMENTATION-1 — Implementation Certification

| Field | Value |
|---|---|
| **Program** | CRMP-IMPLEMENTATION-1 |
| **Date** | 2026-07-24 |
| **Constitution** | ADR-ARCH-020 · 022 · 026 · **028** · CRMP-DOMAIN-DESIGN-1 |
| **Verdict** | **CRMP DOMAIN FOUNDATION CERTIFIED** |

---

## 1. Executive Summary

Foundational CRMP domain layer is implemented exactly as certified:

- Aggregate Roots: **Register**, **Financial Shift**
- Entities: Drawer, Drawer Movement, Drawer Count, Shift Handover
- VOs: Opening Float, Drawer Variance, statuses, MoneyAmount
- Association: **Settlement Attribution** (domain model only — **not** Settlement-integrated)

Persistence is **additive** (`0077_crmp`). No Check / Settlement / Settlement Record / Reporting schema changes. No UI, routers, channel adoption, or Settlement hooks.

---

## 2. Files Created

### Shared domain (`shared/crmp/`)

| File | Role |
|------|------|
| `index.ts` | Barrel |
| `crmpErrors.ts` | Domain errors |
| `valueObjects.ts` | Money / status / variance VOs |
| `register/*` | Register AR contract, lifecycle, commands |
| `financialShift/*` | Shift AR, expected cash, commands |
| `__tests__/*` | Aggregate / lifecycle / invariant tests |

### Server (`server/crmp/`)

| File | Role |
|------|------|
| `CrmpRepository.ts` | Repository ports |
| `InMemoryCrmpStore.ts` | In-memory UoW for tests |
| `DrizzleCrmpRepository.ts` | Drizzle persistence adapter |
| `RegisterDomainService.ts` | Register service |
| `FinancialShiftDomainService.ts` | Shift / attribution / handover service |
| `DrawerDomainService.ts` | Drawer façade → Shift |
| `crmpIds.ts` | Identity helper |
| `index.ts` | Server barrel |
| `__tests__/*` | Service, repository, architecture guards |

### Persistence

| File | Role |
|------|------|
| `drizzle/0077_crmp.sql` | Additive migration |
| `drizzle/schema.ts` | CRMP table definitions (appended) |
| `drizzle/meta/_journal.json` | Journal entry `0077_crmp` |

### Docs

| File | Role |
|------|------|
| `docs/engineering/programs/CRMP-IMPLEMENTATION-1/IMPLEMENTATION.md` | This report |

---

## 3. Database Migrations

| Migration | Tables |
|-----------|--------|
| `0077_crmp` | `crmp_registers`, `crmp_financial_shifts`, `crmp_drawer_movements`, `crmp_drawer_counts`, `crmp_shift_handovers`, `crmp_settlement_attributions` |

**Guarantees:**

- Additive only  
- No FKs into Check / Settlement Record (application-level `settlementRecordId` reference)  
- Unique `settlementRecordId` on attributions (D-INV-13)  
- No ALTER/DROP of certified platform tables  

---

## 4. Aggregate Implementation Report

| Aggregate | Commands implemented |
|-----------|----------------------|
| Register | Provision, Activate, Deactivate, BindDevice, UnbindDevice |
| Financial Shift | Open, Close, RecordMovement, RecordCount, CreateAttribution, Initiate/Accept/Reject Handover |

Expected cash formula implemented in `computeExpectedCash` (float ± movements + attributed cash tender copies).

---

## 5. Repository Report

| Adapter | Use |
|---------|-----|
| `createInMemoryCrmpStore` | Unit / lifecycle tests |
| `createDrizzleCrmpUnitOfWork` | Production persistence |

Repositories persist/load only — domain rules stay in `@shared/crmp` commands.

---

## 6. Lifecycle Validation

| Machine | Coverage |
|---------|----------|
| Register `provisioned → active ⇄ inactive` | Domain + service tests |
| Shift `open → closed` / `open → handover_pending → closed\|open` | Domain + service tests |
| Drawer frozen with closed shift | Immutable mutation tests |
| Attribution terminal + idempotent | Domain + service tests |

---

## 7. Invariant Validation

| Invariant | Enforced |
|-----------|----------|
| D-INV-02 one active shift / register | `hasActiveShiftOnRegister` + service |
| D-INV-03 closed immutable | command guards |
| D-INV-04 attribution needs SR id | validation |
| D-INV-05 register deactivate blocked | `hasActiveShift` |
| D-INV-06 handover two users | command |
| D-INV-07 variance derived | `deriveDrawerVariance` |
| D-INV-08/09 no Settlement mutation | no Settlement imports (guards) |
| D-INV-13 unique attribution / SR | unique index + idempotent command |
| D-INV-14 expected cash formula | `expectedCash.ts` |
| D-INV-15 final count to close | close command |

---

## 8. Migration Validation

Architecture guard asserts `0077_crmp.sql` creates only `crmp_*` tables and does not ALTER settlement/check tables. Journal includes `0077_crmp`.

---

## 9. Architecture Compliance

| Rule | Status |
|------|--------|
| ADR-020 Check sole monetary AR | **Preserved** — CRMP does not settle |
| ADR-026 SR immutable publication | **Preserved** — attribution references id only |
| ADR-028 CRMP boundaries | **Implemented** |
| No Cashier domain | **Met** |
| No UI / Settlement adoption | **Met** |
| No certified schema modification | **Met** |

**STOP condition:** Not triggered.

---

## 10. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Attribution without SR existence check | Deferred to Settlement Attribution adoption program (by design this phase) |
| Active-shift concurrency under load | App-level check + status index; DB partial unique not used (MySQL) |
| Drizzle child replace on save | Acceptable for foundation; optimize later if needed |

---

## 11. Production Readiness

| Item | Status |
|------|--------|
| Domain compiles / tests | Pass |
| Additive migration present | Yes |
| API / UI | **Not in scope** |
| Settlement hook | **Not in scope** |
| Apply migration in prod | Requires normal migration pipeline authorization |

---

## 12. Final Certification

| Criterion | Status |
|-----------|--------|
| All Aggregate contracts implemented | **Met** |
| Invariants pass in tests | **Met** |
| No ADR violation | **Met** |
| No existing platform modified | **Met** |
| No duplicated Settlement logic | **Met** |
| CRMP domain independent | **Met** |
| Migration additive | **Met** |

### Verdict

**CRMP-IMPLEMENTATION-1 — DOMAIN FOUNDATION CERTIFIED**

Successor programs (Settlement Attribution adoption, Screen UI, reporting) remain unauthorized until Architecture Authority sequences them.
