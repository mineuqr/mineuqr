# PRINT-MIGRATION-CLEANUP-AUDIT-1 — Cleanup Recommendations

**Date:** 2026-06-26

**Policy:** Nothing is deleted automatically. All recommendations require explicit program approval.

---

## Safe to Remove

| Item | Rationale | Action |
|------|-----------|--------|
| *(none in runtime)* | RESET-1 already removed executable legacy | No further runtime deletion recommended |

Runtime is already at minimum viable footprint for ADR-ARCH-012 compliance.

---

## Keep

| Item | Rationale |
|------|-----------|
| `OrderPrintingConsumer` | Certified integration hook; PRINTING-1 extension point |
| `OrderPrintDispatchPort` + `LogOrderPrintDispatchPort` | Port/adapter pattern for future real dispatch |
| `OrderKitchenConsumer` | Parallel certified foundation for KITCHEN-DISPLAY-1 |
| `order_print_dispatch_requested` ops event | Observability contract |
| P-07 / P-08 projection metadata | READ-ARCHITECTURE-1 catalog |
| Migrations 0030–0043 | Journal integrity; documents history + purification |
| RESET-1 / ADR-ARCH-012 / READ-ARCHITECTURE-1 docs | Authoritative architecture |
| Consumer + registry tests | Certification coverage |

---

## Needs Verification

| Item | Question | Suggested verification |
|------|----------|------------------------|
| Commercial audit docs (`PG-1C.2C`, `PG-1C.2D`) | Are unbannered print rows causing operator confusion? | Architecture review; add RESET-1 staleness banner |
| Migration comments referencing `preflight-printing-integrity-audit.ts` | Cosmetic drift only | Optional doc-only SQL comment update in separate hygiene program |
| `getOrderById` in `OrderPrintingConsumer` | Should `orderNumber` move to event envelope? | ORDER-EVENTS or PRINTING-1 design decision |
| Re-use of dropped table names in PRINTING-1 | Will new schema collide semantically with old? | PRINTING-1 schema design review against 0030–0042 history |

---

## Needs Migration (Before / During PRINTING-1)

| Item | From | To |
|------|------|-----|
| `LogOrderPrintDispatchPort` | No-op | Real dispatch implementation writing job state |
| Print queue persistence | None | New migrations (0047+) + Drizzle schema |
| `PrintingQueueProjectionConsumer` | Type only | Implemented consumer + P-08 tables |
| `server/printing/read/` module | Path reference only | New module with read services |
| Q-30 `printing.read.getQueue` | Doc only | tRPC procedure in PRINTING-1 |
| Commercial feature keys | Removed | **Needs product decision** — reintroduce `thermalPrinting` etc. or new keys? |

---

## Future Refactor (Not Cleanup — New Programs)

| Item | Program |
|------|---------|
| Print workspace UI | PRINT-WORKSPACE-1 |
| ESC/POS connector + device queue | PRINT-CONNECTOR-1 |
| Kitchen queue projection P-07 | KITCHEN-DISPLAY-1 |
| Split integration vs projection dispatch for print | PRINTING-1 (per RA-06) |
| Historical migration breakpoint gaps (0035–0037) | Optional hygiene — **low priority**; do not rewrite applied journal entries without governance |

---

## Explicitly Do NOT Remove

| Item | Reason |
|------|--------|
| Migrations 0030–0042 | Journal immutability; fresh DB reproducibility |
| `0043_print_purification.sql` | Required retirement migration |
| Event consumer registrations | Production-certified ORDER-EVENTS-1B |
| `Cairo-Variable.ttf` | Commercial PDF — unrelated to thermal print |

---

## Cleanup Sequencing (Recommended)

```
Phase 0 (this audit)          ✓ Complete — inventory only
Phase 1 (doc hygiene)         Optional — commercial audit banners
Phase 2 (PRINTING-1)          New schema + real port + P-08
Phase 3 (PRINT-WORKSPACE-1)   UI on Q-30
Phase 4 (PRINT-CONNECTOR-1)   Device layer
```

**No Phase 0.5 runtime cleanup required** — RESET-1 already executed substantive removal.

---

## Risk of Premature Cleanup

| If removed prematurely | Consequence |
|------------------------|-------------|
| `OrderPrintingConsumer` | Breaks ADR-ARCH-012 certified path; blocks PRINTING-1 wiring |
| Print migrations from journal | Breaks `pnpm db:migrate` on fresh clones |
| P-08 metadata | Loses READ-ARCHITECTURE-1 traceability |
| `LogOrderPrintDispatchPort` before replacement | Silent loss of extension point |
