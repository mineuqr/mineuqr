# FINANCIAL-CUSTODY-PLANE-1 — ADR-ARCH-033 Publication

| Field | Value |
|---|---|
| **Program** | ADR-ARCH-033-FINANCIAL-CUSTODY-PLANE · FINANCIAL-CUSTODY-PLANE-1 |
| **Phase** | Architecture Governance |
| **Deliverable** | ADR-ARCH-033 Financial Custody Plane |
| **Date** | 2026-07-27 |
| **Mode** | Architecture Authority — constitutional publication |
| **Design base** | [REGISTER-REFUND-SETTLEMENT-ARCHITECTURE-1](../REGISTER-REFUND-SETTLEMENT-ARCHITECTURE-1/ARCHITECTURE-DECISION.md) — **ARCHITECTURE CERTIFIED** |
| **Verdict** | **ADR ACCEPTED — architecture publication only** |

## Artifacts

| Artifact | Path |
|----------|------|
| ADR | `docs/architecture/adrs/ADR-ARCH-033-financial-custody-plane.md` |
| Registry row | `docs/architecture/constitution/ADR-Registry.md` |
| Design predecessor | `docs/engineering/programs/REGISTER-REFUND-SETTLEMENT-ARCHITECTURE-1/` |

## Deliverables checklist

| Deliverable | Status |
|-------------|--------|
| ADR-ARCH-033 | **Published** |
| Architecture Rationale | **§2** |
| Ownership Matrix | **§5** |
| Responsibility Matrix | **§6** |
| Invariant Catalogue (FC-INV-01…17) | **§7** |
| Lifecycle Governance | **§8** |
| Event Catalogue | **§9** |
| Compatibility Analysis | **§14** |
| Future Extension Guidelines | **§15** |
| Architecture Constitution Update | **Registry + ADR §19** |

## Certification

| Criterion | Status |
|-----------|--------|
| Financial Custody Plane canonicalized | **Met** |
| Financial ownership remains unique (Check) | **Met** |
| No duplicated money ownership | **Met** |
| No new Aggregate Roots | **Met** |
| No Settlement Record duplication | **Met** |
| No Reporting ownership duplication | **Met** |
| Existing domains unmodified | **Met** |
| Compatible with ADR-001 / 002 / 003 / 021 / 022 / 028 / 030 / 032 | **Met** |
| Future cash ops extensible without redesign | **Met** |
| Production code / schema / migrations in this program | **None** |
| Implementation authorized by this ADR alone | **No** |

## Constitutional one-liners established

1. Financial Authority decides and owns money.  
2. Financial Custody executes and accounts for custody only.  
3. Financial Custody SHALL NEVER become a source of financial truth.  
4. Custody never creates, destroys, or recalculates money.  
5. Custody executes only approved Financial Documents (when document-linked).  
6. Financial Documents remain immutable.  
7. CRMP remains sole owner of Register / Shift / Drawer / Attribution.  
8. Financial Custody Plane is governance — not a new Aggregate Root.  
9. Cashier is Staff User role — never a domain Aggregate.  
10. Register Refund Settlement is a custody specialization; completion = `SettlementAttributed`.

## Final Certification

**ARCHITECTURE CERTIFIED**
