# REFUND-PLATFORM-ARCHITECTURE-1 — ADR-ARCH-032 Publication

| Field | Value |
|---|---|
| **Program** | REFUND-PLATFORM-ARCHITECTURE-1 |
| **Phase** | Architecture Decision Record (ADR) |
| **Deliverable** | ADR-ARCH-032 Refund Platform Architecture |
| **Date** | 2026-07-26 |
| **Mode** | Architecture Authority — constitutional publication |
| **Investigation** | [ARCHITECTURE-INVESTIGATION.md](./ARCHITECTURE-INVESTIGATION.md) — **READY FOR ADR** |
| **Verdict** | **ADR ACCEPTED — architecture publication only** |

## Artifacts

| Artifact | Path |
|----------|------|
| ADR | `docs/architecture/adrs/ADR-ARCH-032-refund-platform.md` |
| Registry row | `docs/architecture/constitution/ADR-Registry.md` |
| Investigation | `docs/engineering/programs/REFUND-PLATFORM-ARCHITECTURE-1/ARCHITECTURE-INVESTIGATION.md` |

## Certification

| Criterion | Status |
|-----------|--------|
| Investigation not reopened | **Met** |
| No production code | **Met** |
| No schema / API / migrations | **Met** |
| No redesign of Check / Register / Settlement Record | **Met** |
| Mandatory ownership decisions constitutionalized | **Met** |
| Settlement Ledger defined as entry point (not authority) | **Met** |
| Implementation authorized | **No** |

## Constitutional one-liners established

1. Refund Platform is a Financial Settlement Platform capability.  
2. Financial Settlement Platform is owned by Check Aggregate.  
3. Settlement Ledger is the Unified Financial Entry Point.  
4. Settlement Ledger is NOT the financial authority.  
5. Check Aggregate remains the sole monetary authority.  
6. Settlement Record remains immutable.  
7. Refund publishes compensating Settlement Records.  
8. Register owns custody only.  
9. Reporting consumes immutable financial publications.

Successor programs remain unauthorized until Architecture Authority sequences them (see ADR §23).
